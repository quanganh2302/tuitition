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

  const revenue = Array(13).fill(0); // index 1..12
  const salary = Array(13).fill(0);

  // Doanh thu = Σ (HS có mặt × đơn giá HS)
  const atts = await prisma.attendance.findMany({
    where: { status: "PRESENT", classSession: { date: { gte: from, lt: to }, ...org } },
    select: {
      student: { select: { tuition: true } },
      classSession: { select: { date: true } },
    },
  });
  for (const a of atts) revenue[vnMonth(new Date(a.classSession.date))] += a.student.tuition;

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
    />
  );
};

export default FinanceChartContainer;
