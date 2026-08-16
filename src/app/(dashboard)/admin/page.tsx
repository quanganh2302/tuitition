import Announcements from "@/components/Announcements";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import CountChartContainer from "@/components/CountChartContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import FinanceChartContainer from "@/components/FinanceChartContainer";
import UserCard from "@/components/UserCard";
import RevenueCard from "@/components/RevenueCard";
import WeatherCard from "@/components/WeatherCard";
import prisma from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { isSoloAdmin } from "@/lib/solo";
import { computeSoloIncome } from "@/lib/finance";
import { getTranslations } from "next-intl/server";

const AdminPage = async ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  // Solo = admin CÓ hồ sơ Teacher + là GV duy nhất (D1). Center admin → dashboard tổng.
  const { userId, orgId } = getScope();
  const isSolo = await isSoloAdmin(userId);
  const t = await getTranslations("Dashboard");
  const week = Number(searchParams.week) || 0;
  const year = Number(searchParams.year) || 0;

  let myStudents = 0;
  let income = 0;
  if (isSolo && userId) {
    const now = new Date();
    myStudents = await prisma.student.count({ where: { ownerTeacherId: userId } });
    const inc = await computeSoloIncome(
      userId,
      now.getFullYear(),
      now.getMonth() + 1,
      orgId ?? undefined
    );
    income = inc.total;
  }

  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        {/* HÀNG THẺ TRÊN — solo: thời tiết + HS/thu nhập của tôi; center: tổng quan trung tâm */}
        <div className="flex gap-4 justify-between flex-wrap">
          {isSolo ? (
            <>
              <WeatherCard />
              <div className="rounded-2xl bg-lucasPurple p-4 flex-1 min-w-[130px] flex flex-col justify-center">
                <h1 className="text-2xl font-semibold">{myStudents}</h1>
                <h2 className="text-sm font-medium text-gray-600 mt-2">{t("solo_my_students")}</h2>
              </div>
              <div className="rounded-2xl bg-lucasYellow p-4 flex-1 min-w-[130px] flex flex-col justify-center">
                <h1 className="text-2xl font-semibold">{income.toLocaleString("vi-VN")}₫</h1>
                <h2 className="text-sm font-medium text-gray-600 mt-2">{t("solo_income")}</h2>
              </div>
            </>
          ) : (
            <>
              <UserCard type="admin" />
              <UserCard type="teacher" />
              <UserCard type="student" />
              <RevenueCard />
            </>
          )}
        </div>
        {/* MIDDLE CHARTS */}
        <div className="flex gap-4 flex-col lg:flex-row">
          {/* COUNT CHART */}
          <div className="w-full lg:w-1/3 h-[450px]">
            <CountChartContainer />
          </div>
          {/* ATTENDANCE CHART */}
          <div className="w-full lg:w-2/3 h-[450px]">
            <AttendanceChartContainer week={week} />
          </div>
        </div>
        {/* BOTTOM CHART */}
        <div className="w-full h-[500px]">
          <FinanceChartContainer year={year} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <EventCalendarContainer />
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;
