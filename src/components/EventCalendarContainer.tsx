import EventCalendar from "./EventCalendar";
import prisma from "@/lib/prisma";
import { toVietnamMidnightUTC } from "@/lib/utils";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";

const DAY_IDX: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const EventCalendarContainer = async () => {
  const t = await getTranslations("Dashboard");
  // Số lớp (đang hoạt động: chưa quá endDate + còn HS đang học) học vào từng thứ.
  const now = new Date();
  const todayEnc = toVietnamMidnightUTC(
    new Date(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const grouped = await prisma.class.groupBy({
    by: ["date"],
    where: {
      ...orgWhere(getScope()),
      OR: [{ endDate: null }, { endDate: { gte: todayEnc } }],
      students: { some: { isStudying: true } },
    },
    _count: true,
  });
  const countByWeekday = Array(7).fill(0);
  for (const g of grouped) countByWeekday[DAY_IDX[g.date]] = g._count;

  return (
    <div className="bg-white p-4 rounded-md">
      <h1 className="text-lg font-semibold mb-2">{t("week_calendar")}</h1>
      <EventCalendar classCountByWeekday={countByWeekday} />
    </div>
  );
};

export default EventCalendarContainer;
