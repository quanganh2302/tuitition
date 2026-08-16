import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getScope, orgWhere } from "@/lib/scope";

// Lấy dữ liệu điểm danh của 1 buổi: học sinh của lớp + điểm danh đã có + trạng thái buổi.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const scope = getScope();
  const { userId, role } = scope;

  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: {
          students: { select: { id: true, studentName: true } },
        },
      },
      attendances: { select: { studentId: true, status: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Tenant scoping: buổi phải thuộc trung tâm của actor (super-admin bỏ qua).
  if (!scope.isSuperAdmin && session.orgId !== scope.orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Scoping: teacher chỉ điểm danh buổi của lớp mình hoặc buổi mình dạy thay
  const isAdmin = role === "admin";
  if (
    !isAdmin &&
    !scope.isSuperAdmin &&
    session.class.teacherId !== userId &&
    session.taughtById !== userId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attendance: Record<string, string> = {};
  for (const a of session.attendances) attendance[a.studentId] = a.status;

  // Dạy thay chỉ có ở chế độ TRUNG TÂM (≥2 giáo viên TRONG trung tâm). Solo (1 GV) không có (D4).
  const teacherCount = await prisma.teacher.count({ where: { ...orgWhere(scope) } });
  const isCenterMode = teacherCount >= 2;
  const teachers =
    isAdmin && isCenterMode
      ? await prisma.teacher.findMany({
          where: { ...orgWhere(scope) },
          select: { id: true, teacherName: true },
        })
      : [];

  return NextResponse.json({
    status: session.status,
    taughtById: session.taughtById,
    students: session.class.students,
    attendance,
    isAdmin,
    isCenterMode,
    teachers,
  });
}
