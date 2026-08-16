import prisma from "@/lib/prisma";
import Image from "next/image";
import { toVietnamMidnightUTC } from "@/lib/utils";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";

const fmt = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)}tr` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : `${v}`;

// Thẻ doanh thu: số lớn = doanh thu cả năm; badge = doanh thu tháng này.
// Doanh thu = Σ (HS có mặt × đơn giá HS).
const RevenueCard = async () => {
  const t = await getTranslations("Dashboard");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const yearFrom = toVietnamMidnightUTC(new Date(year, 0, 1));
  const yearTo = toVietnamMidnightUTC(new Date(year + 1, 0, 1));
  const monthFrom = toVietnamMidnightUTC(new Date(year, month, 1));
  const monthTo = toVietnamMidnightUTC(new Date(year, month + 1, 1));

  const atts = await prisma.attendance.findMany({
    where: {
      status: "PRESENT",
      classSession: { date: { gte: yearFrom, lt: yearTo }, ...orgWhere(getScope()) },
    },
    select: {
      student: { select: { tuition: true } },
      classSession: { select: { date: true } },
    },
  });

  let yearRev = 0;
  let monthRev = 0;
  for (const a of atts) {
    yearRev += a.student.tuition;
    const d = a.classSession.date;
    if (d >= monthFrom && d < monthTo) monthRev += a.student.tuition;
  }

  return (
    <div className="rounded-2xl bg-lucasYellow p-4 flex-1 min-w-[130px]">
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
          {month + 1}/{year}: {fmt(monthRev)}
        </span>
        <Image src="/more.png" alt="" width={20} height={20} />
      </div>
      <h1 className="text-2xl font-semibold my-4">{fmt(yearRev)}</h1>
      <h2 className="text-sm font-medium text-gray-500">{t("revenue_year", { year })}</h2>
    </div>
  );
};

export default RevenueCard;
