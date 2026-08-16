import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import StudentAttendanceGauge from "@/components/StudentAttendanceGauge";
import prisma from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { randomBgImage, toVietnamMidnightUTC } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { Teacher } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const SingleTeacherPage = async ({
  params: { id },
}: {
  params: { id: string };
}) => {
  const scope = getScope();
  const { role } = scope;
  const t = await getTranslations("TeacherDetail");

  const teacher:
    | (Teacher & {
        _count: { ownedStudents: number; taughtSessions: number; classes: number };
      })
    | null = await prisma.teacher.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ownedStudents: true,
          taughtSessions: true,
          classes: true,
        },
      },
    },
  });

  if (!teacher) {
    return notFound();
  }
  // Tenant scoping: không xem GV ngoài trung tâm của mình (super-admin bỏ qua).
  if (!scope.isSuperAdmin && teacher.orgId !== scope.orgId) {
    return notFound();
  }

  // Tỉ lệ buổi NGHỈ tháng này = buổi CANCELED / tổng buổi đã tới hạn (date ≤ hôm nay), của GV này.
  const now = new Date();
  const monthFrom = toVietnamMidnightUTC(new Date(now.getFullYear(), now.getMonth(), 1));
  const todayEnc = toVietnamMidnightUTC(
    new Date(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const monthSessions = await prisma.classSession.findMany({
    where: {
      date: { gte: monthFrom, lte: todayEnc },
      OR: [{ taughtById: teacher.id }, { class: { teacherId: teacher.id } }],
    },
    select: { status: true },
  });
  const totalDue = monthSessions.length;
  const canceledCount = monthSessions.filter((s) => s.status === "CANCELED").length;
  const cancelRate = totalDue > 0 ? Math.round((canceledCount / totalDue) * 100) : null;

  // Chuyên cần TỪNG học viên của GV = số buổi PRESENT / tổng lượt điểm danh.
  const ownedStudents = await prisma.student.findMany({
    where: { ownerTeacherId: teacher.id },
    select: { id: true, studentName: true },
  });
  const sids = ownedStudents.map((s) => s.id);
  const atts = sids.length
    ? await prisma.attendance.findMany({
        where: { studentId: { in: sids } },
        select: { studentId: true, status: true },
      })
    : [];
  const stat = new Map(sids.map((id) => [id, { present: 0, total: 0 }]));
  for (const a of atts) {
    const st = stat.get(a.studentId);
    if (!st) continue;
    st.total++;
    if (a.status === "PRESENT") st.present++;
  }
  const attendanceStudents = ownedStudents.map((s) => ({
    id: s.id,
    name: s.studentName,
    present: stat.get(s.id)!.present,
    total: stat.get(s.id)!.total,
  }));
  return (
    <div className="flex-1 min-h-0 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3 xl:flex xl:flex-col xl:min-h-0">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* USER INFO CARD */}
          <div
            className="relative overflow-hidden bg-lucasSky bg-cover bg-center py-6 px-4 rounded-md flex-1 flex gap-4"
            style={{ backgroundImage: `url(${randomBgImage()})` }}
          >
            <div className="absolute inset-0 z-0 bg-black/20" />
            <div className="relative z-10 w-1/3">
              <Image
                src={teacher.avatar || "/noAvatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>
            <div className="relative z-10 w-2/3 flex flex-col justify-between gap-4 text-white">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold">{teacher.teacherName}</h1>
                {role === "admin" && (
                  <FormContainer table="teacher" type="update" data={teacher} plain />
                )}
              </div>
              <p className="text-base text-white/70">
                {teacher.subject || t("role_default")}
              </p>
              <div className="flex items-center justify-between gap-2 flex-wrap text-sm font-medium">
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/mail.png" alt="" width={18} height={18} className="brightness-0 invert" />
                  <span>{teacher.email || "-"}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={18} height={18} className="brightness-0 invert" />
                  <span>{teacher.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-[47%] md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {cancelRate === null ? "—" : `${cancelRate}%`}
                </h1>
                <span className="text-sm text-gray-400">{t("cancel_rate")}</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-[47%] md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleLesson.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {teacher._count.taughtSessions}
                </h1>
                <span className="text-sm text-gray-400">{t("sessions")}</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-[47%] md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleClass.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {teacher._count.classes}
                </h1>
                <span className="text-sm text-gray-400">{t("classes")}</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-[47%] md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleBranch.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {teacher._count.ownedStudents}
                </h1>
                <span className="text-sm text-gray-400">{t("students")}</span>
              </div>
            </div>
          </div>
        </div>
        {/* BOTTOM — full height còn lại từ xl trở lên; dưới xl (root chuyển flex-col, hết điểm tựa
            chiều cao) dùng chiều cao cố định như code mẫu, tránh lịch bị co sát mất */}
        <div className="mt-4 bg-white rounded-md p-4 flex flex-col overflow-hidden h-[600px] xl:h-auto xl:flex-1 xl:min-h-0">
          <h1>{t("schedule")}</h1>
          <div className="flex-1 min-h-0 mt-2">
            <BigCalendarContainer type="teacherId" id={teacher.id} />
          </div>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">{t("shortcuts")}</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link
              className="p-3 rounded-md bg-lucasSkyLight"
              href={`/list/classes?teacherId=${teacher.id}`}
            >
              {t("shortcut_classes")}
            </Link>
            <Link
              className="p-3 rounded-md bg-lucasPurpleLight"
              href={`/list/students?teacherId=${teacher.id}`}
            >
              {t("shortcut_students")}
            </Link>
            <Link
              className="p-3 rounded-md bg-lucasYellowLight"
              href={`/list/lessons?teacherId=${teacher.id}`}
            >
              {t("shortcut_lessons")}
            </Link>
          </div>
        </div>
        <StudentAttendanceGauge students={attendanceStudents} />
        <Announcements ownerTeacherId={teacher.id} />
      </div>
    </div>
  );
};

export default SingleTeacherPage;
