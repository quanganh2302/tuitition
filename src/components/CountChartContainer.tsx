import CountChart from "./CountChart";
import PeriodNav from "./PeriodNav";
import prisma from "@/lib/prisma";
import { getScope, orgWhere } from "@/lib/scope";
import { toVietnamMidnightUTC } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

// Tỉ lệ THU NHẬP theo tháng (lướt qua lại bằng PeriodNav) giữa lớp Trung tâm (nhóm sĩ số, pay đã
// chốt) và Gia sư (điểm danh từng HS — ưu tiên số đã chốt MonthlyTuition, cùng cách tính với
// FinanceChartContainer).
const CountChartContainer = async ({ month: monthOffset = 0 }: { month?: number }) => {
  const t = await getTranslations("Dashboard");
  const tc = await getTranslations("Common");
  const org = orgWhere(getScope());

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const from = toVietnamMidnightUTC(new Date(target.getFullYear(), target.getMonth(), 1));
  const to = toVietnamMidnightUTC(new Date(target.getFullYear(), target.getMonth() + 1, 1));
  const year = target.getFullYear();
  const month = target.getMonth() + 1;

  let center = 0;
  let priv = 0;

  // Lớp nhóm sĩ số (D2): thu nhập = Σ pay đã chốt lúc điểm danh.
  const groupSessions = await prisma.classSession.findMany({
    where: { status: "TAUGHT", date: { gte: from, lt: to }, pay: { not: null }, ...org },
    select: { pay: true, class: { select: { type: true } } },
  });
  for (const s of groupSessions) {
    if (s.class.type === "CENTER") center += s.pay ?? 0;
    else priv += s.pay ?? 0;
  }

  // Lớp có roster (điểm danh từng HS): ưu tiên số đã chốt (MonthlyTuition), fallback giá hiện tại.
  const chot = await prisma.monthlyTuition.findMany({
    where: { year, month, ...org },
    select: { studentId: true, classId: true, totalAmount: true },
  });
  const chotMap = new Map(chot.map((c) => [`${c.studentId}::${c.classId}`, c.totalAmount]));

  const atts = await prisma.attendance.findMany({
    where: { status: "PRESENT", classSession: { date: { gte: from, lt: to }, ...org } },
    select: {
      student: { select: { id: true, tuition: true } },
      classSession: { select: { classId: true, class: { select: { type: true } } } },
    },
  });
  const chotAdded = new Set<string>();
  for (const a of atts) {
    const classId = a.classSession.classId;
    const key = `${a.student.id}::${classId}`;
    const chotAmount = chotMap.get(key);
    const amount = chotAmount !== undefined ? (chotAdded.has(key) ? 0 : chotAmount) : a.student.tuition;
    if (chotAmount !== undefined) chotAdded.add(key);
    if (a.classSession.class.type === "CENTER") center += amount;
    else priv += amount;
  }

  const total = center + priv;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const fmt = (n: number) => `${n.toLocaleString("vi-VN")}₫`;

  return (
    <div className="bg-white rounded-xl w-full h-full p-4 transition-opacity has-[[aria-busy=true]]:opacity-60">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold">{t("class_types")}</h1>
          <span className="text-xs text-gray-400">
            {month}/{year}
          </span>
        </div>
        <PeriodNav value={monthOffset} param="month" resetLabel={tc("this_month")} />
      </div>
      <CountChart center={center} priv={priv} />
      <div className="flex justify-center gap-16">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-lucasSky rounded-full" />
          <h1 className="font-bold">{fmt(center)}</h1>
          <h2 className="text-xs text-gray-300">{t("type_center_pct", { pct: pct(center) })}</h2>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-5 h-5 bg-lucasYellow rounded-full" />
          <h1 className="font-bold">{fmt(priv)}</h1>
          <h2 className="text-xs text-gray-300">{t("type_private_pct", { pct: pct(priv) })}</h2>
        </div>
      </div>
    </div>
  );
};

export default CountChartContainer;
