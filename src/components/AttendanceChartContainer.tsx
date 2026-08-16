import AttendanceChart from "./AttendanceChart";
import PeriodNav from "./PeriodNav";
import prisma from "@/lib/prisma";
import { toVietnamMidnightUTC } from "@/lib/utils";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";

// Nhãn trục ngang ngắn gọn theo ngôn ngữ — key nội bộ (Mon..Sun) giữ nguyên để gom dữ liệu.
const DAY_LABELS: Record<string, Record<string, string>> = {
  vi: { Mon: "T2", Tue: "T3", Wed: "T4", Thu: "T5", Fri: "T6", Sat: "T7", Sun: "CN" },
  en: { Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu", Fri: "Fri", Sat: "Sat", Sun: "Sun" },
};

// Doanh thu học phí theo ngày trong 1 TUẦN (lướt qua lại bằng PeriodNav) = Σ (HS có mặt × đơn giá HS) mỗi buổi, gom theo thứ.
const AttendanceChartContainer = async ({ week = 0 }: { week?: number }) => {
  const t = await getTranslations("Dashboard");
  const tc = await getTranslations("Common");
  const now = new Date();
  const dow = now.getDay(); // 0 = CN
  const diff = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff + week * 7);
  const nextMonday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 7
  );
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(d);
  const from = toVietnamMidnightUTC(monday);
  const to = toVietnamMidnightUTC(nextMonday); // exclusive

  const atts = await prisma.attendance.findMany({
    where: {
      status: "PRESENT",
      classSession: { date: { gte: from, lt: to }, ...orgWhere(getScope()) },
    },
    select: {
      student: { select: { tuition: true } },
      classSession: {
        select: { date: true, class: { select: { type: true } } },
      },
    },
  });

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const center: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
  const priv: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
  const vnWeekday = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(d);

  for (const a of atts) {
    const wd = vnWeekday(new Date(a.classSession.date));
    if (center[wd] === undefined) continue;
    if (a.classSession.class.type === "CENTER") center[wd] += a.student.tuition;
    else priv[wd] += a.student.tuition;
  }

  const locale = cookies().get("locale")?.value === "en" ? "en" : "vi";
  const labels = DAY_LABELS[locale];
  const data = days.map((d) => ({ name: labels[d], center: center[d], private: priv[d] }));

  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold">{t("week_revenue")}</h1>
          <span className="text-xs text-gray-400">
            {fmtDate(monday)} - {fmtDate(sunday)}
          </span>
        </div>
        <PeriodNav value={week} param="week" resetLabel={tc("today")} />
      </div>
      <AttendanceChart data={data} />
    </div>
  );
};

export default AttendanceChartContainer;
