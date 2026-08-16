import prisma from "@/lib/prisma";
import FinanceChart from "./FinanceChart";
import PeriodNav from "./PeriodNav";
import { toVietnamMidnightUTC } from "@/lib/utils";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Doanh thu/Lương theo năm (lướt qua lại bằng PeriodNav).
const FinanceChartContainer = async ({ year: yearOffset = 0 }: { year?: number }) => {
  const tc = await getTranslations("Common");
  const year = new Date().getFullYear() + yearOffset;
  const from = toVietnamMidnightUTC(new Date(year, 0, 1));
  const to = toVietnamMidnightUTC(new Date(year + 1, 0, 1));
  const vnMonth = (d: Date) =>
    Number(
      new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(d)
    );

  const org = orgWhere(getScope()); // scope theo trung tâm của actor

  // Solo (org chỉ 1 GV): không có biên lợi nhuận trung tâm/GV riêng — mọi tiền HS đóng đều là
  // thu nhập của chính GV đó. Lớp nhóm sĩ số (D2) solo → pay tính cả doanh thu lẫn lương.
  const teacherCount = await prisma.teacher.count({ where: org });
  const isSoloOrg = teacherCount <= 1;

  const revenue = Array(13).fill(0); // index 1..12
  const salary = Array(13).fill(0);

  // Doanh thu = Σ (HS có mặt × đơn giá HS) — ưu tiên số đã CHỐT (MonthlyTuition, giá tại thời
  // điểm chốt, không đổi khi Student.tuition đổi sau này); tháng chưa chốt mới tính sống theo
  // giá hiện tại (có thể lệch nếu giá đã thay đổi từ đó tới nay).
  const chotMap = new Map<string, number>(); // `${studentId}::${classId}::${year}-${month}` -> totalAmount
  const chot = await prisma.monthlyTuition.findMany({
    where: { year, ...org },
    select: { studentId: true, classId: true, year: true, month: true, totalAmount: true },
  });
  for (const c of chot) chotMap.set(`${c.studentId}::${c.classId}::${c.year}-${c.month}`, c.totalAmount);

  const atts = await prisma.attendance.findMany({
    where: { status: "PRESENT", classSession: { date: { gte: from, lt: to }, ...org } },
    select: {
      student: { select: { id: true, tuition: true } },
      classSession: { select: { classId: true, date: true } },
    },
  });
  const chotAdded = new Set<string>(); // tránh cộng lặp — 1 khoản chốt cộng đúng 1 lần dù nhiều buổi PRESENT
  for (const a of atts) {
    const d = new Date(a.classSession.date);
    const m = vnMonth(d);
    const y = Number(
      new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(d)
    );
    const key = `${a.student.id}::${a.classSession.classId}::${y}-${m}`;
    const chotAmount = chotMap.get(key);
    if (chotAmount !== undefined) {
      if (chotAdded.has(key)) continue;
      chotAdded.add(key);
      revenue[m] += chotAmount;
    } else {
      revenue[m] += a.student.tuition;
    }
  }

  // Lương = Σ giá trị mỗi buổi TAUGHT theo tham số CHỦ LỚP + loại lớp (D3)
  const sessions = await prisma.classSession.findMany({
    where: { status: "TAUGHT", date: { gte: from, lt: to }, ...org },
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
  for (const s of sessions) {
    // Lớp nhóm sĩ số (D2, không điểm danh từng HS): lương = pay đã chốt lúc điểm danh sĩ số,
    // không tính qua attendances (luôn rỗng cho lớp này). Solo → cộng luôn vào doanh thu.
    if (s.pay !== null) {
      const m = vnMonth(new Date(s.date));
      salary[m] += s.pay;
      if (isSoloOrg) revenue[m] += s.pay;
      continue;
    }
    const owner = s.class.teacher;
    if (!owner) continue;
    const val =
      s.class.type === "PRIVATE"
        ? owner.privateRatePerSession
        : owner.centerBasePerSession + s.attendances.length * owner.centerRatePerStudent;
    salary[vnMonth(new Date(s.date))] += val;
  }

  const data = MONTHS.map((name, i) => ({
    name,
    revenue: revenue[i + 1],
    salary: salary[i + 1],
  }));

  return (
    <FinanceChart
      data={data}
      periodLabel={tc("year_label", { year })}
      nav={<PeriodNav value={yearOffset} param="year" resetLabel={tc("this_year")} />}
      showSalary={!isSoloOrg}
    />
  );
};

export default FinanceChartContainer;
