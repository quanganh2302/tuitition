import Announcements from "@/components/Announcements";
import AttendanceGauge from "@/components/AttendanceGauge";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import prisma from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { capitalizeFirst, dailyBgImage } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";
import { Student } from "@prisma/client";
import Image from "next/image";
import { notFound } from "next/navigation";

const SingleStudentPage = async ({
  params: { id },
  searchParams,
}: {
  params: { id: string };
  searchParams: { month?: string };
}) => {
  const scope = getScope();
  const { userId, role } = scope;
  const t = await getTranslations("StudentDetail");
  const locale = await getLocale();

  // Vào từ nút "Xem" của 1 khoản học phí (?month=YYYY-MM) → mở lịch sẵn đúng tháng đó.
  const [focusYear, focusMonth] = (searchParams.month ?? "").split("-").map(Number);
  const focusDate =
    focusYear && focusMonth ? new Date(focusYear, focusMonth - 1, 1) : undefined;

  const student:
    | (Student & { _count: { classes: number } })
    | null = await prisma.student.findUnique({
    where: { id },
    include: { _count: { select: { classes: true } } },
  });

  if (!student) {
    return notFound();
  }

  // Tenant scoping: không xem HS ngoài trung tâm của mình (super-admin bỏ qua).
  if (!scope.isSuperAdmin && student.orgId !== scope.orgId) {
    return notFound();
  }
  // Scoping: giáo viên chỉ xem HS mình phụ trách (không xem HS của GV khác qua URL)
  if (role === "teacher" && student.ownerTeacherId !== userId) {
    return notFound();
  }

  // Số liệu THẬT: chuyên cần (% có mặt) + số buổi có mặt.
  const atts = await prisma.attendance.findMany({
    where: { studentId: id },
    select: { status: true },
  });
  const totalAtt = atts.length;
  const presentCount = atts.filter((a) => a.status === "PRESENT").length;
  const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : null;
  const joined = capitalizeFirst(
    new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(student.createdAt)
  );

  return (
    <div className="flex-1 min-h-0 p-4 flex flex-col gap-4 xl:flex-row">
      {/* Left */}
      <div className="w-full xl:w-2/3 xl:flex xl:flex-col xl:min-h-0">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* USER CARD INFO  */}
          <div
            className="relative overflow-hidden bg-lucasSky bg-cover bg-center py-6 px-4 rounded-md flex-1 flex gap-4"
            style={{ backgroundImage: `url(${dailyBgImage(`student-${student.id}`)})` }}
          >
            <div className="absolute inset-0 z-0 bg-black/20" />
            <div className="relative z-10 w-1/3">
              <Image
                src={student.avatar || "/noAvatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>
            <div className="relative z-10 w-2/3 flex flex-col justify-between gap-4 text-white">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold">{student.studentName}</h1>
                {role === "admin" && (
                  <FormContainer table="student" type="update" data={student} plain />
                )}
              </div>
              <p className="text-base text-white/70">{student.address}</p>
              <div className="flex items-center justify-between gap-2 flex-wrap text-sm font-medium">
                <div className="w-full md:w-1/2 flex items-center gap-2">
                  <Image src="/date.png" alt="" width={18} height={18} className="brightness-0 invert" />
                  <span>{joined}</span>
                </div>{" "}
                <div className="w-full md:w-1/2 flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={18} height={18} className="brightness-0 invert" />
                  <span>{student.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARD  */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-[47%] md:w-[47%]">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {attendanceRate === null ? "—" : `${attendanceRate}%`}
                </h1>
                <span className="text-sm text-gray-400">{t("attendance_rate")}</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-[47%] md:w-[47%]">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{presentCount}</h1>
                <span className="text-sm text-gray-400">{t("present_sessions")}</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-[47%] md:w-[47%]">
              <Image
                src="/singleClass.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{student._count.classes}</h1>
                <span className="text-sm text-gray-400">{t("classes")}</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-[47%] md:w-[47%]">
              <Image
                src="/singleLesson.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {student.tuition.toLocaleString("vi-VN")}₫
                </h1>
                <span className="text-sm text-gray-400">{t("tuition")}</span>
              </div>
            </div>
          </div>
        </div>
        {/* BOTTOM — full height từ xl trở lên; dưới xl dùng chiều cao cố định (giống code mẫu) */}
        <div className="mt-4 bg-white rounded-md p-4 flex flex-col overflow-hidden h-[600px] xl:h-auto xl:flex-1 xl:min-h-0">
          <h1>{t("schedule")}</h1>
          <div className="flex-1 min-h-0 mt-2">
            <BigCalendarContainer type="studentId" id={student.id} focusDate={focusDate} />
          </div>
        </div>
      </div>
      {/* right */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white rounded-xl w-full p-4 flex flex-col">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-semibold">{t("attendance_widget_title")}</h1>
            <Image src="/moreDark.png" alt="" width={20} height={20} />
          </div>
          <AttendanceGauge
            present={presentCount}
            total={totalAtt}
            presentLabel={t("present_label")}
            absentLabel={t("absent_label")}
          />
        </div>
        <Announcements studentId={student.id} />
      </div>
    </div>
  );
};

export default SingleStudentPage;
