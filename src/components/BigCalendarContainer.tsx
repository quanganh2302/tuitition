import prisma from "@/lib/prisma";
import BigCalendarClient from "./BigCalendarClient";
import { Prisma } from "@prisma/client";
import { ensureDueSessions } from "@/lib/actions";
import { weekdayOccurrences } from "@/lib/scheduling";
import { toVietnamMidnightUTC } from "@/lib/utils";
import { DEFAULT_CENTER_COLOR, DEFAULT_PRIVATE_COLOR } from "@/lib/classColors";

const BigCalendarContainer = async ({
  type,
  id,
  focusDate,
}: {
  type: "teacherId" | "classId" | "studentId";
  id: string | number;
  focusDate?: Date; // vào từ nút "Xem" học phí → nới khoảng tải để tháng cũ này không bị trống
}) => {
  const where: Prisma.ClassWhereInput =
    type === "teacherId"
      ? { teacherId: String(id) }
      : type === "studentId"
      ? { students: { some: { id: String(id) } } }
      : { id: String(id) };

  // Vật chất hoá buổi đã tới hạn cho phạm vi này trước khi vẽ.
  await ensureDueSessions(where);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnc = toVietnamMidnightUTC(today);
  // Chỉ lấy buổi thật trong ~2 tháng gần đây (đừng kéo cả lịch sử) — lịch chủ yếu xem gần hiện tại.
  // Trừ khi có focusDate (vào từ nút "Xem" 1 khoản học phí cũ) — nới về đúng tháng đó để không bị trống.
  const recentStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const focusMonthStart = focusDate && new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
  const windowStart = toVietnamMidnightUTC(
    focusMonthStart && focusMonthStart < recentStart ? focusMonthStart : recentStart
  );

  const classes = await prisma.class.findMany({
    where,
    include: {
      classSessions: { where: { date: { gte: windowStart } } },
      students: { where: { isStudying: true }, select: { id: true } },
    },
  });
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const horizonEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0); // ~2 tháng tới (cuối tháng sau)

  const events = classes.flatMap((cls) => {
    // Màu lịch: CENTER (nhóm hoặc chọn tay) dùng chung 1 màu; PRIVATE theo màu đã chọn ở form.
    const colorKey =
      cls.type === "CENTER" ? DEFAULT_CENTER_COLOR : cls.color || DEFAULT_PRIVATE_COLOR;
    const at = (base: Date) => {
      const s = new Date(base);
      s.setHours(cls.startTime.getUTCHours(), cls.startTime.getUTCMinutes(), 0, 0);
      const e = new Date(base);
      e.setHours(cls.endTime.getUTCHours(), cls.endTime.getUTCMinutes(), 0, 0);
      return { s, e };
    };

    // Buổi THẬT (đã vật chất hoá) — click điểm danh nếu date <= hôm nay.
    const real = cls.classSessions.map((ss) => {
      const { s, e } = at(new Date(ss.date));
      const attendable = ss.date <= todayEnc;
      const mark =
        ss.status === "TAUGHT"
          ? " ✅"
          : ss.status === "CANCELED"
          ? " ❌"
          : attendable
          ? " ⏳"
          : "";
      return {
        id: ss.id,
        title: `${cls.className}${mark}`,
        start: s,
        end: e,
        date: ss.date,
        attendable,
        isVirtual: false,
        color: colorKey,
      };
    });

    // Buổi TƯƠNG LAI ẢO (không lưu) — chỉ khi lớp còn active; hiển thị đồng bộ lịch, không click.
    const active =
      cls.students.length > 0 && (!cls.endDate || cls.endDate >= todayEnc);
    if (!active) return real;

    const materialized = new Set(cls.classSessions.map((ss) => ss.date.getTime()));
    let futs = weekdayOccurrences(cls.date, tomorrow, horizonEnd);
    if (cls.endDate) futs = futs.filter((d) => d <= cls.endDate!);
    const virtual = futs
      .filter((d) => !materialized.has(d.getTime()))
      .map((d) => {
        const { s, e } = at(new Date(d));
        return {
          id: null,
          title: `${cls.className} (dự kiến)`,
          start: s,
          end: e,
          date: d,
          attendable: false,
          isVirtual: true,
          color: colorKey,
        };
      });

    return [...real, ...virtual];
  });

  return <BigCalendarClient events={events} focusDate={focusDate} />;
};

export default BigCalendarContainer;
