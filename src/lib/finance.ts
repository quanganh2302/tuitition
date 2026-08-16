import prisma from "./prisma";

// Engine học phí + lương (Phase 3). Hàm thuần theo tham số → dùng được cho cả server action lẫn test.
// Công thức chốt ở docs/DESIGN-roles-and-substitute.md (D3/D4).

// Khoảng thời gian 1 tháng (theo giờ VN, khớp cách lưu date của buổi — golden rule #8).
const monthRange = (year: number, month: number) => {
  // month 1..12; buổi lưu ở mốc nửa-đêm-VN-mã-hoá-UTC (lùi 7h) → nới biên 1 ngày mỗi phía cho an toàn,
  // rồi lọc chính xác bằng giờ VN ở tầng gọi nếu cần. Ở đây dùng biên UTC rộng vừa đủ.
  const from = new Date(Date.UTC(year, month - 1, 1) - 7 * 3600 * 1000);
  const to = new Date(Date.UTC(year, month, 1) - 7 * 3600 * 1000);
  return { from, to };
};

// Số buổi 1 HV có mặt (PRESENT) trong 1 lớp, trong tháng.
export const countPresentSessions = async (
  studentId: string,
  classId: string,
  year: number,
  month: number
) => {
  const { from, to } = monthRange(year, month);
  return prisma.attendance.count({
    where: {
      studentId,
      status: "PRESENT",
      classSession: { classId, date: { gte: from, lt: to } },
    },
  });
};

// Học phí 1 HV / 1 lớp / tháng = số buổi có mặt × đơn giá/buổi (Student.tuition).
export const computeStudentTuition = async (
  studentId: string,
  classId: string,
  year: number,
  month: number
) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { tuition: true },
  });
  const present = await countPresentSessions(studentId, classId, year, month);
  return present * (student?.tuition ?? 0);
};

// Sinh MonthlyTuition cho các (HV, lớp) có buổi trong tháng NHƯNG CHƯA từng được chốt.
// Khoản đã tồn tại (đã đóng hay chưa) không bị đụng vào nữa — sửa số tiền sau khi đã chốt
// phải qua updateMonthlyTuitionAmount (sửa tay), không tự tính lại khi bấm chốt lần nữa.
// ownerTeacherId: nếu truyền, chỉ chốt học phí cho HV thuộc GV đó (scoping theo sở hữu).
export const generateMonthlyTuition = async (
  year: number,
  month: number,
  ownerTeacherId?: string,
  orgId?: string // tenant: chỉ chốt học phí trong 1 trung tâm (undefined = mọi trung tâm, cho super-admin/nội bộ)
) => {
  const { from, to } = monthRange(year, month);

  // Các cặp (student, class) có ít nhất 1 lần điểm danh PRESENT trong tháng.
  const present = await prisma.attendance.findMany({
    where: {
      status: "PRESENT",
      classSession: { date: { gte: from, lt: to }, ...(orgId ? { orgId } : {}) },
      ...(ownerTeacherId ? { student: { ownerTeacherId } } : {}),
    },
    select: { studentId: true, classSession: { select: { classId: true } } },
  });

  // gom theo (studentId, classId)
  const pairs = new Map<string, { studentId: string; classId: string }>();
  for (const a of present) {
    const key = `${a.studentId}::${a.classSession.classId}`;
    if (!pairs.has(key))
      pairs.set(key, {
        studentId: a.studentId,
        classId: a.classSession.classId,
      });
  }

  const existing = await prisma.monthlyTuition.findMany({
    where: {
      year,
      month,
      studentId: { in: Array.from(new Set(Array.from(pairs.values()).map((p) => p.studentId))) },
    },
    select: { studentId: true, classId: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.studentId}::${e.classId}`));

  let count = 0;
  for (const { studentId, classId } of Array.from(pairs.values())) {
    if (existingKeys.has(`${studentId}::${classId}`)) continue; // đã chốt trước đó — bỏ qua
    const totalAmount = await computeStudentTuition(
      studentId,
      classId,
      year,
      month
    );
    await prisma.monthlyTuition.create({
      data: { studentId, classId, year, month, totalAmount, orgId }, // paidStatus mặc định UNPAID
    });
    count++;
  }
  return count;
};

export type SalaryLine = {
  sessionId: string;
  classId: string;
  className: string;
  type: "CENTER" | "PRIVATE";
  isSubstitute: boolean; // dạy thay (taughtById khác chủ lớp)
  presentCount: number;
  amount: number;
};

// Thu nhập giáo viên SOLO / tháng = Σ (mỗi buổi HS có mặt × học phí/buổi của CHÍNH HS đó).
// Solo tự set học phí khác nhau cho từng HS → thu nhập tính theo tuition từng HS, KHÔNG theo rate cứng của GV.
export const computeSoloIncome = async (
  ownerTeacherId: string,
  year: number,
  month: number,
  orgId?: string
): Promise<{ total: number; sessions: number }> => {
  const { from, to } = monthRange(year, month);
  // (1) Gia sư: Σ (buổi HS có mặt × học phí HS).
  const present = await prisma.attendance.findMany({
    where: {
      status: "PRESENT",
      student: { ownerTeacherId },
      classSession: { date: { gte: from, lt: to }, ...(orgId ? { orgId } : {}) },
    },
    select: { student: { select: { tuition: true } } },
  });
  const tuitionIncome = present.reduce((s, a) => s + (a.student?.tuition ?? 0), 0);
  // (2) Lớp nhóm (D2, không hồ sơ HS): Σ tiền `pay` mỗi buổi GV dạy.
  const groupSessions = await prisma.classSession.findMany({
    where: {
      pay: { not: null },
      status: "TAUGHT",
      date: { gte: from, lt: to },
      ...(orgId ? { orgId } : {}),
      OR: [{ taughtById: ownerTeacherId }, { class: { teacherId: ownerTeacherId } }],
    },
    select: { pay: true },
  });
  const groupPay = groupSessions.reduce((s, x) => s + (x.pay ?? 0), 0);
  return {
    total: tuitionIncome + groupPay,
    sessions: present.length + groupSessions.length,
  };
};

// Lương 1 GV / tháng = Σ buổi TAUGHT mà người thực dạy = GV này,
// mỗi buổi tính theo tham số CHỦ LỚP + Class.type (D3).
export const computeTeacherSalary = async (
  teacherId: string,
  year: number,
  month: number,
  orgId?: string // tenant: giới hạn buổi trong 1 trung tâm (undefined = không lọc)
): Promise<{ total: number; lines: SalaryLine[] }> => {
  const { from, to } = monthRange(year, month);

  const sessions = await prisma.classSession.findMany({
    where: { status: "TAUGHT", date: { gte: from, lt: to }, ...(orgId ? { orgId } : {}) },
    include: {
      class: {
        include: {
          teacher: {
            select: {
              privateRatePerSession: true,
              centerBasePerSession: true,
              centerRatePerStudent: true,
            },
          },
        },
      },
      attendances: { where: { status: "PRESENT" }, select: { id: true } },
    },
  });

  const lines: SalaryLine[] = [];
  for (const s of sessions) {
    // người thực dạy: taughtById nếu có, ngược lại = chủ lớp
    const effectiveTeacher = s.taughtById ?? s.class.teacherId;
    if (effectiveTeacher !== teacherId) continue;

    const owner = s.class.teacher; // tham số lương của CHỦ LỚP
    if (!owner) continue; // lớp chưa gán chủ → không tính được

    const presentCount = s.attendances.length;
    const amount =
      s.class.type === "PRIVATE"
        ? owner.privateRatePerSession
        : owner.centerBasePerSession + presentCount * owner.centerRatePerStudent;

    lines.push({
      sessionId: s.id,
      classId: s.classId,
      className: s.class.className,
      type: s.class.type,
      isSubstitute: !!s.taughtById && s.taughtById !== s.class.teacherId,
      presentCount,
      amount,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { total, lines };
};
