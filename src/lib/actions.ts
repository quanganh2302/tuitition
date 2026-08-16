"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  ClassSchema,
  ParentSchema,
  StudentSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getScope, orgWhere, type Scope } from "./scope";
import { toVietnamMidnightUTC, normalizeVN } from "./utils";
import { weekdayOccurrences } from "./scheduling";
import { generateMonthlyTuition } from "./finance";
import { Prisma } from "@prisma/client";

type CurrentState = { success: boolean; error: boolean; message?: string };

// Vai trò + id + tenant (orgId) của người dùng hiện tại. Xem lib/scope.ts.
const getCurrentActor = (): Scope => getScope();

// Chặn nếu không phải admin (dùng cho CRUD giáo viên/phụ huynh — chỉ trung tâm quản).
const denyIfNotAdmin = () => {
  const { role } = getCurrentActor();
  return role !== "admin"
    ? { success: false, error: true, message: "Chỉ admin được thực hiện thao tác này." }
    : null;
};

// Hạn mức số giáo viên / trung tâm (kiểu freemium). Mặc định 3; super-admin nâng qua
// org.publicMetadata.teacherLimit. Vượt hạn → admin gửi yêu cầu (upgradeRequested) để super-admin duyệt.
const DEFAULT_TEACHER_LIMIT = 3;
type OrgLike = { publicMetadata: unknown };
const teacherLimitOf = (org: OrgLike): number => {
  const lim = (org.publicMetadata as { teacherLimit?: number } | null)?.teacherLimit;
  return typeof lim === "number" && lim > 0 ? lim : DEFAULT_TEACHER_LIMIT;
};

// Mô hình B: VẬT CHẤT HOÁ QUÁ KHỨ, SUY RA TƯƠNG LAI.
// ensureDueSessions chỉ tạo các buổi ĐÃ TỚI HẠN (date <= hôm nay) cho lớp còn "active"
// (chưa quá endDate + còn ≥1 HS đang học). Tương lai KHÔNG lưu (vẽ ảo ở lịch) → HS nghỉ sớm
// chỉ cần isStudying=false, không phải purge/đồng bộ gì. Gọi on-demand khi mở lessons/lịch.
// Floor = đầu tháng này (không backfill khoảng đã nghỉ ở các tháng trước). Idempotent (skipDuplicates).
export const ensureDueSessions = async (where?: Prisma.ClassWhereInput) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayEnc = toVietnamMidnightUTC(today);
  const monthStartEnc = toVietnamMidnightUTC(monthStart);

  // Lớp còn active: chưa quá endDate + còn ≥1 HS đang học.
  const classes = await prisma.class.findMany({
    where: {
      ...(where ?? {}),
      OR: [{ endDate: null }, { endDate: { gte: todayEnc } }],
      students: { some: { isStudying: true } },
    },
    select: { id: true, date: true, endDate: true, orgId: true },
  });
  if (classes.length === 0) return;

  // Buổi đã có trong [đầu tháng, hôm nay] → chỉ tạo phần THIẾU (bình thường 0 → không ghi DB).
  const existing = await prisma.classSession.findMany({
    where: {
      classId: { in: classes.map((c) => c.id) },
      date: { gte: monthStartEnc, lte: todayEnc },
    },
    select: { classId: true, date: true },
  });
  const have = new Set(existing.map((s) => `${s.classId}|${s.date.getTime()}`));

  const toCreate: { classId: string; date: Date; status: "UPCOMING"; orgId: string | null }[] = [];
  for (const c of classes) {
    let dates = weekdayOccurrences(c.date, monthStart, today);
    if (c.endDate) dates = dates.filter((d) => d <= c.endDate!);
    for (const date of dates) {
      if (!have.has(`${c.id}|${date.getTime()}`)) {
        toCreate.push({ classId: c.id, date, status: "UPCOMING", orgId: c.orgId });
      }
    }
  }
  if (toCreate.length) {
    await prisma.classSession.createMany({ data: toCreate, skipDuplicates: true });
  }
};

// "HH:mm" → số phút trong ngày (để so khoảng giờ).
const timeToMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Kiểm trùng lịch dạy: cùng GV + cùng thứ + GIAO khoảng giờ + lớp cũ CHƯA kết thúc (endDate null hoặc >= hôm nay).
// Lớp cũ coi như bắt đầu trong quá khứ nên chỉ cần nó còn active là giao với lớp mới (bắt đầu từ hôm nay).
export const checkTeacherConflict = async (data: {
  id?: string;
  teacherId?: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<{
  conflicts: { id: string; className: string; startTime: string; endTime: string; endDate: string | null }[];
}> => {
  const scope = getCurrentActor();
  const { userId, role } = scope;
  const teacherId = role === "teacher" ? userId : data.teacherId;
  if (!teacherId || !data.date || !data.startTime || !data.endTime) {
    return { conflicts: [] };
  }

  const newStart = timeToMinutes(data.startTime);
  const newEnd = timeToMinutes(data.endTime);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const candidates = await prisma.class.findMany({
    where: {
      ...orgWhere(scope), // chỉ dò trùng trong trung tâm của actor
      teacherId,
      date: data.date as any,
      ...(data.id ? { id: { not: data.id } } : {}),
      OR: [{ endDate: null }, { endDate: { gte: today } }], // lớp cũ còn active
    },
    select: { id: true, className: true, startTime: true, endTime: true, endDate: true },
  });

  const hhmm = (d: Date) =>
    `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

  const conflicts = candidates
    .filter((c) => {
      const cs = c.startTime.getUTCHours() * 60 + c.startTime.getUTCMinutes();
      const ce = c.endTime.getUTCHours() * 60 + c.endTime.getUTCMinutes();
      return newStart < ce && cs < newEnd; // giao khoảng giờ
    })
    .map((c) => ({
      id: c.id,
      className: c.className,
      startTime: hhmm(c.startTime),
      endTime: hhmm(c.endTime),
      endDate: c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
    }));

  return { conflicts };
};

// Dịch lỗi Clerk / Prisma sang thông báo tiếng Việt dễ hiểu cho người dùng
const getErrorMessage = (error: any): string => {
  // Lỗi từ Clerk (tạo/sửa tài khoản đăng nhập)
  if (error?.clerkError && Array.isArray(error?.errors) && error.errors.length) {
    const e = error.errors[0];
    const map: Record<string, string> = {
      form_password_pwned:
        "Mật khẩu này đã bị lộ trong một vụ rò rỉ dữ liệu. Vui lòng dùng mật khẩu khác.",
      form_password_length_too_short: "Mật khẩu quá ngắn (tối thiểu 8 ký tự).",
      form_password_not_strong_enough: "Mật khẩu chưa đủ mạnh.",
      form_password_size_in_bytes_exceeded: "Mật khẩu quá dài.",
      form_identifier_exists: "Username hoặc email đã tồn tại.",
      form_username_invalid_length:
        "Username không hợp lệ (độ dài không phù hợp).",
      form_param_format_invalid: "Định dạng thông tin không hợp lệ.",
      form_param_nil: "Thiếu thông tin bắt buộc.",
    };
    return map[e.code] || e.longMessage || e.message || "Dữ liệu không hợp lệ.";
  }
  // Lỗi trùng dữ liệu từ Prisma (unique constraint)
  if (error?.code === "P2002") {
    const target = Array.isArray(error?.meta?.target)
      ? error.meta.target.join(", ")
      : "một trường";
    return `Giá trị bị trùng (${target}). Vui lòng nhập giá trị khác.`;
  }
  // Lỗi khoá ngoại (vd: xoá giáo viên còn lớp đang phụ trách)
  if (error?.code === "P2003") {
    return "Không thể xoá vì còn dữ liệu liên quan (ví dụ: giáo viên còn lớp đang phụ trách). Hãy gỡ/đổi trước rồi thử lại.";
  }
  return "Có lỗi xảy ra, vui lòng thử lại.";
};

// "yyyy-mm-dd" → ngày chuẩn hoá nửa-đêm-VN (khớp cách lưu date buổi), hoặc null.
const parseEndDate = (s?: string | null): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return toVietnamMidnightUTC(new Date(y, m - 1, d));
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  const { userId, role, orgId } = getCurrentActor();
  const teacherId = role === "teacher" ? userId : data.teacherId || null;
  // Lớp nhóm theo sĩ số (D2): type=CENTER, không roster, lưu base + rate.
  const isGroup = !!data.isGroup;
  try {
    const startTime = new Date(`2025-01-01T${data.startTime}:00Z`); // Convert time string to Date
    const endTime = new Date(`2025-01-01T${data.endTime}:00Z`); // Convert time string to Date
    const endDate = parseEndDate(data.endDate);

    const newClass = await prisma.class.create({
      data: {
        orgId, // tenant của người tạo
        className: data.className,
        searchName: normalizeVN(data.className),
        type: isGroup ? "CENTER" : data.type,
        teacherId,
        date: data.date,
        endDate,
        startTime, // Store as Date
        endTime, // Store as Date
        groupBasePerSession: isGroup ? data.groupBasePerSession ?? 0 : null,
        groupRatePerStudent: isGroup ? data.groupRatePerStudent ?? 0 : null,
        // Màu chỉ áp cho lớp PRIVATE — CENTER (nhóm hoặc chọn tay) dùng chung màu mặc định.
        color: (isGroup ? "CENTER" : data.type) === "CENTER" ? null : data.color || null,
        students: isGroup
          ? undefined
          : {
              connect: data.students?.map((studentsId: string) => ({ id: studentsId })),
            },
        classSessions: data.teachingRecords?.length
          ? {
              connect: data.teachingRecords.map((trd: any) => ({
                id: trd.id,
              })),
            }
          : undefined,
      },
    });

    // Vật chất hoá các buổi đã tới hạn (nếu có); tương lai để vẽ ảo ở lịch.
    await ensureDueSessions({ id: newClass.id });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: getErrorMessage(err) };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Thiếu ID để cập nhật." };
  }
  const startTime = new Date(`2025-01-01T${data.startTime}:00Z`); // Convert time string to Date
  const endTime = new Date(`2025-01-01T${data.endTime}:00Z`); // Convert time string to Date
  const endDate = parseEndDate(data.endDate);
  const scope = getCurrentActor();
  const { userId, role } = scope;
  // Scoping: lớp phải thuộc trung tâm của actor (admin/teacher); teacher còn phải là chủ lớp.
  if (!scope.isSuperAdmin) {
    const owned = await prisma.class.findFirst({
      where: {
        id: data.id,
        ...orgWhere(scope),
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true },
    });
    if (!owned) {
      return { success: false, error: true, message: "Bạn không có quyền sửa lớp này." };
    }
  }
  const teacherId = role === "teacher" ? userId : data.teacherId || null;
  const isGroup = !!data.isGroup;
  try {
    await prisma.class.update({
      where: { id: data.id },
      data: {
        className: data.className,
        searchName: normalizeVN(data.className),
        type: isGroup ? "CENTER" : data.type,
        teacherId,
        date: data.date,
        endDate,
        startTime,
        endTime,
        groupBasePerSession: isGroup ? data.groupBasePerSession ?? 0 : null,
        groupRatePerStudent: isGroup ? data.groupRatePerStudent ?? 0 : null,
        color: (isGroup ? "CENTER" : data.type) === "CENTER" ? null : data.color || null,
        students: isGroup
          ? { set: [] }
          : { set: data.students?.map((studentId: string) => ({ id: studentId })) },
        classSessions: {
          set: data.teachingRecords?.map((tr) => ({ id: tr.id })),
        },
      },
    });

    // Đồng bộ buổi: ensureDueSessions tự dọn buổi tương lai (future là ảo) + vật chất hoá buổi tới hạn.
    // Rút ngắn endDate / HS nghỉ → future ảo tự tắt, không cần purge riêng.
    await ensureDueSessions({ id: data.id });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: getErrorMessage(err) };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const scope = getCurrentActor();
  const { userId, role } = scope;
  if (!scope.isSuperAdmin) {
    const owned = await prisma.class.findFirst({
      where: {
        id,
        ...orgWhere(scope),
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true },
    });
    if (!owned) {
      return { success: false, error: true, message: "Bạn không có quyền xoá lớp này." };
    }
  }
  try {
    await prisma.class.delete({
      where: { id: id },
    });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true, message: getErrorMessage(err) };
  }
};

// Tạo giáo viên TRỰC TIẾP: admin đặt username + mật khẩu (email chỉ là field liên hệ tuỳ chọn — KHÔNG
// xác minh). Tạo Clerk user (role=teacher, orgId) + org membership + Teacher row; rollback nếu lỗi giữa chừng.
export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  const deny = denyIfNotAdmin();
  if (deny) return deny;
  const { orgId } = getCurrentActor();
  if (!orgId) {
    return { success: false, error: true, message: "Tài khoản chưa gắn trung tâm." };
  }

  let createdUserId: string | null = null;
  try {
    const org = await clerkClient.organizations.getOrganization({ organizationId: orgId });
    // Solo (đăng ký loại "solo") = một mình → KHÔNG được thêm giáo viên.
    if ((org.publicMetadata as { orgType?: string } | null)?.orgType === "solo") {
      return {
        success: false,
        error: true,
        message: "Tài khoản giáo viên solo chỉ có một mình bạn, không thể thêm giáo viên.",
      };
    }

    // Hạn mức GV: đếm GV hiện có. Vượt → code "LIMIT" để form bung popup xin nâng quyền.
    const limit = teacherLimitOf(org);
    const count = await prisma.teacher.count({ where: { orgId } });
    if (count >= limit) {
      return {
        success: false,
        error: true,
        code: "LIMIT",
        message: `Đã đạt giới hạn ${limit} giáo viên của trung tâm.`,
      };
    }

    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.teacherName,
      lastName: "Teacher",
      // role → middleware định tuyến; orgId → getScope đọc tenant đồng bộ.
      publicMetadata: { role: "teacher", orgId },
    });
    createdUserId = user.id;

    // Thêm GV vào Clerk Organization của admin (org:member) → GV đăng nhập vào đúng trung tâm.
    await clerkClient.organizations.createOrganizationMembership({
      organizationId: orgId,
      userId: user.id,
      role: "org:member",
    });

    await prisma.teacher.create({
      data: {
        id: user.id, // dùng Clerk userId làm id giáo viên
        orgId, // tenant = trung tâm của admin tạo
        username: data.username,
        teacherName: data.teacherName,
        searchName: normalizeVN(data.teacherName),
        email: data.email || null,
        phone: data.phone || null,
        avatar: data.avatar || null,
        sex: data.sex,
        subject: data.subject || null,
        privateRatePerSession: data.privateRatePerSession,
        centerBasePerSession: data.centerBasePerSession,
        centerRatePerStudent: data.centerRatePerStudent,
      },
    });
    return { success: true, error: false };
  } catch (error) {
    console.error("Error creating teacher:", error);
    // Rollback: xoá user Clerk vừa tạo (kéo theo membership) nếu bước sau lỗi — tránh user rác.
    if (createdUserId) {
      try {
        await clerkClient.users.deleteUser(createdUserId);
      } catch (rollbackError) {
        console.error("Error during rollback:", rollbackError);
      }
    }
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  const deny = denyIfNotAdmin();
  if (deny) return deny;
  if (!data.id) {
    return { success: false, error: true, message: "Thiếu ID để cập nhật." };
  }
  const scope = getCurrentActor();
  const owned = await prisma.teacher.findFirst({
    where: { id: data.id, ...orgWhere(scope) },
    select: { id: true },
  });
  if (!owned) {
    return { success: false, error: true, message: "Giáo viên không thuộc trung tâm của bạn." };
  }
  try {
    await clerkClient.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.teacherName,
      lastName: "Teacher",
    });
    await prisma.teacher.update({
      where: { id: data.id },
      data: {
        username: data.username,
        teacherName: data.teacherName,
        searchName: normalizeVN(data.teacherName),
        email: data.email || null,
        phone: data.phone || null,
        avatar: data.avatar || null,
        sex: data.sex,
        subject: data.subject || null,
        privateRatePerSession: data.privateRatePerSession,
        centerBasePerSession: data.centerBasePerSession,
        centerRatePerStudent: data.centerRatePerStudent,
      },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const deny = denyIfNotAdmin();
  if (deny) return deny;
  const id = data.get("id") as string;
  const scope = getCurrentActor();
  const owned = await prisma.teacher.findFirst({
    where: { id, ...orgWhere(scope) },
    select: { id: true },
  });
  if (!owned) {
    return { success: false, error: true, message: "Giáo viên không thuộc trung tâm của bạn." };
  }
  try {
    await clerkClient.users.deleteUser(id);
    await prisma.teacher.delete({ where: { id: id } });
    return { success: true, error: false };
  } catch (error) {
    // Lưu ý: xoá sẽ lỗi nếu GV còn lớp đang phụ trách (FK). Cần gỡ/đổi GV của lớp trước.
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  console.log("Creating student with data:", data);

  // Chủ sở hữu HS: teacher tạo → chính họ; admin tạo → chọn từ form
  const { userId, role, orgId } = getCurrentActor();
  const ownerTeacherId =
    role === "teacher" ? userId : data.ownerTeacherId || null;

  try {
    await prisma.student.create({
      data: {
        orgId, // tenant của người tạo
        ownerTeacherId,
        studentName: data.studentName,
        searchName: normalizeVN(data.studentName),
        username: `hv-${normalizeVN(data.studentName).replace(/\s+/g, "")}-${Date.now().toString(36)}`,
        address: data.address,
        phone: data.phone || null,
        avatar: data.avatar || null,
        isStudying: data.isStudying || false,
        lessonType: data.lessonType,
        sex: data.sex,
        tuition: data.tuition,
        parentId: data.parentId || null,
        classes: {
          connect: data.classes?.map((classId: string) => ({
            id: classId,
          })),
        },

        assignments: data.assignments?.length
          ? {
              connect: data.assignments.map((a: any) => ({
                id: a.id,
              })),
            }
          : undefined,

        monthlyTuition: data.monthlyTuition?.length
          ? {
              create: data.monthlyTuition,
            }
          : undefined,
      },
    });
    return { success: true, error: false };
  } catch (error) {
    console.error("Error creating student:", error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Thiếu ID để cập nhật." };
  }
  const scope = getCurrentActor();
  const { userId, role } = scope;
  // Scoping: HS phải thuộc trung tâm của actor; teacher còn phải là người phụ trách.
  if (!scope.isSuperAdmin) {
    const owned = await prisma.student.findFirst({
      where: {
        id: data.id,
        ...orgWhere(scope),
        ...(role === "teacher" ? { ownerTeacherId: userId! } : {}),
      },
      select: { id: true },
    });
    if (!owned) {
      return { success: false, error: true, message: "Bạn không có quyền sửa học sinh này." };
    }
  }
  const ownerTeacherId =
    role === "teacher" ? userId : data.ownerTeacherId || null;
  try {
    await prisma.student.update({
      where: { id: data.id },
      data: {
        ownerTeacherId,
        studentName: data.studentName,
        searchName: normalizeVN(data.studentName),
        address: data.address,
        phone: data.phone || null,
        avatar: data.avatar || null,
        isStudying: data.isStudying || false,
        lessonType: data.lessonType,
        sex: data.sex,
        tuition: data.tuition,
        parentId: data.parentId || null,
        classes: {
          set: data.classes?.map((classId: string) => ({
            id: classId,
          })),
        },
        assignments: {
          set: data.assignments?.map((assignmentId: any) => ({
            id: assignmentId,
          })),
        },
        monthlyTuition: {
          set: data.monthlyTuition?.map((monthlyTuitionId: any) => ({
            id: monthlyTuitionId,
          })),
        },
      },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};
export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const scope = getCurrentActor();
  const { userId, role } = scope;
  if (!scope.isSuperAdmin) {
    const owned = await prisma.student.findFirst({
      where: {
        id,
        ...orgWhere(scope),
        ...(role === "teacher" ? { ownerTeacherId: userId! } : {}),
      },
      select: { id: true },
    });
    if (!owned) {
      return { success: false, error: true, message: "Bạn không có quyền xoá học sinh này." };
    }
  }
  try {
    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  const deny = denyIfNotAdmin();
  if (deny) return deny;
  const { orgId } = getCurrentActor();
  try {
    await prisma.parent.create({
      data: {
        orgId, // tenant của admin tạo
        parentName: data.parentName,
        searchName: normalizeVN(data.parentName),
        phone: data.phone || null,
        sex: data.sex,
        students: {
          connect: data.students.map((studentId) => ({ id: studentId })),
        },
      },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  const deny = denyIfNotAdmin();
  if (deny) return deny;
  const scope = getCurrentActor();
  const owned = await prisma.parent.findFirst({
    where: { id: data.id, ...orgWhere(scope) },
    select: { id: true },
  });
  if (!owned) {
    return { success: false, error: true, message: "Phụ huynh không thuộc trung tâm của bạn." };
  }
  try {
    await prisma.parent.update({
      where: { id: data.id },
      data: {
        parentName: data.parentName,
        searchName: normalizeVN(data.parentName),
        phone: data.phone || null,
        sex: data.sex,
        students: {
          set: data.students.map((studentId) => ({ id: studentId })),
        },
      },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};
export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const deny = denyIfNotAdmin();
  if (deny) return deny;
  const id = data.get("id") as string;
  const scope = getCurrentActor();
  const owned = await prisma.parent.findFirst({
    where: { id, ...orgWhere(scope) },
    select: { id: true },
  });
  if (!owned) {
    return { success: false, error: true, message: "Phụ huynh không thuộc trung tâm của bạn." };
  }
  try {
    await prisma.parent.delete({
      where: { id: id },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

export const deleteClassSession = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const scope = getCurrentActor();
  const { userId, role } = scope;
  if (!scope.isSuperAdmin) {
    if (role !== "admin" && role !== "teacher") {
      return { success: false, error: true, message: "Không có quyền." };
    }
    const owned = await prisma.classSession.findFirst({
      where: {
        id,
        ...orgWhere(scope),
        ...(role === "teacher" ? { class: { teacherId: userId! } } : {}),
      },
      select: { id: true },
    });
    if (!owned) {
      return { success: false, error: true, message: "Bạn không có quyền xoá buổi này." };
    }
  }
  try {
    await prisma.classSession.delete({
      where: { id: id },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

// Điểm danh 1 buổi: cập nhật trạng thái buổi (+ GV dạy thay nếu admin) và điểm danh từng HV.
export const markAttendance = async (
  currentState: CurrentState,
  data: {
    sessionId: string;
    status: "UPCOMING" | "TAUGHT" | "CANCELED";
    taughtById?: string | null;
    attendance: { studentId: string; present: boolean }[];
  }
) => {
  try {
    const scope = getCurrentActor();
    const { userId, role } = scope;
    const session = await prisma.classSession.findUnique({
      where: { id: data.sessionId },
      include: { class: { select: { teacherId: true } } },
    });
    if (!session) {
      return { success: false, error: true, message: "Không tìm thấy buổi học." };
    }
    // Chốt chặn tenant: buổi phải thuộc trung tâm của actor (super-admin bỏ qua).
    if (!scope.isSuperAdmin && session.orgId !== scope.orgId) {
      return { success: false, error: true, message: "Buổi không thuộc trung tâm của bạn." };
    }
    // Chặn điểm danh buổi CHƯA diễn ra (tương lai).
    const nowD = new Date();
    const todayEnc = toVietnamMidnightUTC(
      new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate())
    );
    if (session.date > todayEnc) {
      return {
        success: false,
        error: true,
        message: "Buổi chưa diễn ra, chưa thể điểm danh.",
      };
    }
    // Scoping: teacher chỉ điểm danh buổi lớp mình hoặc buổi mình dạy thay
    if (
      role !== "admin" &&
      session.class.teacherId !== userId &&
      session.taughtById !== userId
    ) {
      return {
        success: false,
        error: true,
        message: "Bạn không có quyền điểm danh buổi này.",
      };
    }

    await prisma.classSession.update({
      where: { id: data.sessionId },
      data: {
        status: data.status,
        // Chỉ admin (trung tâm) được gán giáo viên dạy thay
        ...(role === "admin" ? { taughtById: data.taughtById || null } : {}),
      },
    });

    for (const a of data.attendance) {
      await prisma.attendance.upsert({
        where: {
          classSessionId_studentId: {
            classSessionId: data.sessionId,
            studentId: a.studentId,
          },
        },
        create: {
          classSessionId: data.sessionId,
          studentId: a.studentId,
          status: a.present ? "PRESENT" : "ABSENT",
        },
        update: { status: a.present ? "PRESENT" : "ABSENT" },
      });
    }

    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};


// ===== HỌC PHÍ (surfacing) =====

// Chốt học phí tháng: sinh/cập nhật MonthlyTuition = số buổi có mặt × đơn giá HV.
// admin: mọi HV; teacher: chỉ HV mình phụ trách. Giữ nguyên paidStatus đã có.
export const closeMonthlyTuition = async (
  currentState: CurrentState,
  data: { year: number; month: number }
) => {
  const { userId, role, orgId } = getCurrentActor();
  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: true, message: "Không có quyền." };
  }
  try {
    const ownerTeacherId = role === "teacher" ? userId! : undefined;
    const count = await generateMonthlyTuition(
      data.year,
      data.month,
      ownerTeacherId,
      orgId ?? undefined // chỉ chốt học phí trong trung tâm của actor
    );
    return {
      success: true,
      error: false,
      message: `Đã chốt học phí tháng ${data.month}/${data.year} (${count} khoản).`,
    };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

// Đánh dấu 1 khoản học phí đã đóng / chưa đóng. teacher chỉ sửa HV của mình.
export const setTuitionPaid = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const paid = data.get("paid") === "true";
  const scope = getCurrentActor();
  const { userId, role } = scope;
  try {
    if (!scope.isSuperAdmin) {
      const t = await prisma.monthlyTuition.findFirst({
        where: {
          id,
          ...orgWhere(scope),
          ...(role === "teacher" ? { student: { ownerTeacherId: userId! } } : {}),
        },
        select: { id: true },
      });
      if (!t) {
        return { success: false, error: true, message: "Không có quyền." };
      }
    }
    await prisma.monthlyTuition.update({
      where: { id },
      data: { paidStatus: paid ? "PAID" : "UNPAID" },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

// Sửa tay số tiền 1 khoản học phí đã chốt (vd điểm danh có sai sót phát hiện sau khi đã chốt).
export const updateMonthlyTuitionAmount = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const totalAmount = Number(data.get("totalAmount"));
  const scope = getCurrentActor();
  const { userId, role } = scope;
  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: true, message: "Không có quyền." };
  }
  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    return { success: false, error: true, message: "Số tiền không hợp lệ." };
  }
  try {
    if (!scope.isSuperAdmin) {
      const t = await prisma.monthlyTuition.findFirst({
        where: {
          id,
          ...orgWhere(scope),
          ...(role === "teacher" ? { student: { ownerTeacherId: userId! } } : {}),
        },
        select: { id: true },
      });
      if (!t) {
        return { success: false, error: true, message: "Không có quyền." };
      }
    }
    await prisma.monthlyTuition.update({
      where: { id },
      data: { totalAmount: Math.floor(totalAmount) },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

// Ghi 1 buổi LỚP NHÓM (D2): nhập sĩ số → pay = base + max(0, sĩ số − 1) × rate (cho sửa tay).
// Không tạo hồ sơ HS / điểm danh từng HS. Upsert theo (lớp, ngày).
export const recordGroupSession = async (
  currentState: CurrentState,
  data: { classId: string; date: string; headcount: number; pay?: number | null }
) => {
  const scope = getCurrentActor();
  try {
    const klass = await prisma.class.findFirst({
      where: {
        id: data.classId,
        ...orgWhere(scope),
        ...(scope.role === "teacher" ? { teacherId: scope.userId! } : {}),
      },
      select: {
        id: true, teacherId: true, orgId: true,
        groupBasePerSession: true, groupRatePerStudent: true,
      },
    });
    if (!klass || klass.groupBasePerSession === null) {
      return { success: false, error: true, message: "Không tìm thấy lớp nhóm hoặc không có quyền." };
    }
    const [y, m, d] = data.date.split("-").map(Number);
    if (!y || !m || !d) return { success: false, error: true, message: "Ngày không hợp lệ." };
    const dateEnc = toVietnamMidnightUTC(new Date(y, m - 1, d));
    const hc = Math.max(0, Math.floor(data.headcount || 0));
    const computed =
      (klass.groupBasePerSession ?? 0) + Math.max(0, hc - 1) * (klass.groupRatePerStudent ?? 0);
    const pay =
      data.pay != null && !Number.isNaN(data.pay) ? Math.max(0, Math.floor(data.pay)) : computed;
    await prisma.classSession.upsert({
      where: { classId_date: { classId: klass.id, date: dateEnc } },
      create: {
        classId: klass.id, orgId: klass.orgId, date: dateEnc,
        status: "TAUGHT", taughtById: klass.teacherId, headcount: hc, pay,
      },
      update: { status: "TAUGHT", headcount: hc, pay },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

// ===== ĐĂNG KÝ CÔNG KHAI — PROVISIONING (Phase C) =====
// Sau khi Clerk tạo user (sign-up), action này: tạo Organization (tenant) do user làm admin,
// gán publicMetadata.role="admin", và (solo) tạo hồ sơ Teacher. Idempotent.
// Loại tài khoản + tên lấy từ user.unsafeMetadata (client set lúc sign-up). Xem docs/DESIGN-multi-tenant.md.
export const provisionAccount = async (): Promise<
  { success: true; orgId: string } | { success: false; message: string }
> => {
  const { userId } = auth();
  if (!userId) return { success: false, message: "Chưa đăng nhập." };
  try {
    const user = await clerkClient.users.getUser(userId);

    // Idempotency: đã có org → không tạo lại (tránh nhân đôi khi gọi 2 lần).
    const memberships = await clerkClient.users.getOrganizationMembershipList({ userId });
    if (memberships.totalCount > 0) {
      return { success: true, orgId: memberships.data[0].organization.id };
    }

    const meta = (user.unsafeMetadata ?? {}) as {
      accountType?: string;
      orgName?: string;
      teacherName?: string;
      sex?: string;
    };
    const isSolo = meta.accountType === "solo";
    const displayName = meta.teacherName?.trim() || user.username || "Chủ tài khoản";
    const orgName =
      meta.orgName?.trim() ||
      (isSolo ? `Lớp của ${displayName}` : `Trung tâm của ${displayName}`);

    const org = await clerkClient.organizations.createOrganization({
      name: orgName,
      createdBy: userId, // → user thành org:admin
      publicMetadata: { orgType: isSolo ? "solo" : "center" },
    });
    // role=admin cho cả trung tâm lẫn solo (solo = admin có kèm hồ sơ Teacher — D1).
    // orgId vào publicMetadata → getScope đọc đồng bộ (không phụ thuộc active org).
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { role: "admin", orgId: org.id },
    });

    if (isSolo) {
      await prisma.teacher.create({
        data: {
          id: userId, // = Clerk userId
          orgId: org.id,
          username: user.username ?? userId,
          teacherName: displayName,
          searchName: normalizeVN(displayName),
          email: user.primaryEmailAddress?.emailAddress ?? null, // email đã xác minh lúc sign-up
          sex: meta.sex === "FEMALE" ? "FEMALE" : "MALE",
        },
      });
    }
    return { success: true, orgId: org.id };
  } catch (error) {
    console.error("provisionAccount error:", error);
    return { success: false, message: getErrorMessage(error) };
  }
};

// Super-admin KHOÁ / MỞ KHOÁ một trung tâm (Phase E). Chỉ set cờ suspended trên org publicMetadata —
// KHÔNG xoá data. Enforce ở (dashboard)/layout: org bị khoá → chặn truy cập. Xem docs/DESIGN-multi-tenant.md.
export const setOrgSuspended = async (
  currentState: CurrentState,
  data: FormData
) => {
  const scope = getCurrentActor();
  if (!scope.isSuperAdmin) {
    return { success: false, error: true, message: "Chỉ super-admin được thực hiện." };
  }
  const orgId = data.get("orgId") as string;
  const suspended = data.get("suspended") === "true";
  try {
    const org = await clerkClient.organizations.getOrganization({ organizationId: orgId });
    await clerkClient.organizations.updateOrganization(orgId, {
      publicMetadata: { ...(org.publicMetadata ?? {}), suspended },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

// Admin trung tâm XIN NÂNG hạn mức GV (khi createTeacher trả code "LIMIT"). Chỉ set cờ
// upgradeRequested trên org → super-admin thấy ở /platform và duyệt. Xem docs/DESIGN-multi-tenant.md.
export const requestTeacherLimit = async (): Promise<CurrentState> => {
  const scope = getCurrentActor();
  if (scope.role !== "admin" || !scope.orgId) {
    return { success: false, error: true, message: "Chỉ admin trung tâm được gửi yêu cầu." };
  }
  try {
    const org = await clerkClient.organizations.getOrganization({ organizationId: scope.orgId });
    await clerkClient.organizations.updateOrganization(scope.orgId, {
      publicMetadata: { ...(org.publicMetadata ?? {}), upgradeRequested: true },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};

// Super-admin ĐẶT hạn mức GV cho 1 trung tâm (duyệt yêu cầu nâng quyền) + xoá cờ upgradeRequested.
export const setOrgTeacherLimit = async (
  currentState: CurrentState,
  data: FormData
) => {
  const scope = getCurrentActor();
  if (!scope.isSuperAdmin) {
    return { success: false, error: true, message: "Chỉ super-admin được thực hiện." };
  }
  const orgId = data.get("orgId") as string;
  const limit = Number(data.get("limit"));
  if (!Number.isInteger(limit) || limit < 1) {
    return { success: false, error: true, message: "Hạn mức không hợp lệ." };
  }
  try {
    const org = await clerkClient.organizations.getOrganization({ organizationId: orgId });
    await clerkClient.organizations.updateOrganization(orgId, {
      publicMetadata: { ...(org.publicMetadata ?? {}), teacherLimit: limit, upgradeRequested: false },
    });
    return { success: true, error: false };
  } catch (error) {
    console.log(error);
    return { success: false, error: true, message: getErrorMessage(error) };
  }
};
