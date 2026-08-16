"use client";

import { Calendar, momentLocalizer, Navigate, View, Views } from "react-big-calendar";
import TimeGrid from "react-big-calendar/lib/TimeGrid";
import moment from "moment";
import "moment/locale/vi";
// Locale "vi" mặc định viết thường tên tháng ("tháng 7") — viết hoa chữ đầu cho khớp UI.
moment.updateLocale("vi", {
  months:
    "Tháng 1_Tháng 2_Tháng 3_Tháng 4_Tháng 5_Tháng 6_Tháng 7_Tháng 8_Tháng 9_Tháng 10_Tháng 11_Tháng 12".split(
      "_"
    ),
});
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getClassColor } from "@/lib/classColors";

const localizer = momentLocalizer(moment);

// View "3 ngày" — rbc không có sẵn, tự dựng theo đúng cách rbc tự viết view Tuần (bọc TimeGrid nội bộ
// + gắn range/navigate/title tĩnh). Dùng cho mobile: 3 cột đủ rộng để đọc, không cần cuộn ngang.
const ThreeDayView = (props: any) => {
  const { date, localizer, ...rest } = props;
  const range = ThreeDayView.range(date, { localizer });
  return <TimeGrid {...rest} date={date} range={range} eventOffset={15} localizer={localizer} />;
};
ThreeDayView.range = (date: Date, { localizer }: any) => {
  const start = localizer.startOf(date, "day");
  const end = localizer.add(start, 2, "day");
  return localizer.range(start, end);
};
ThreeDayView.navigate = (date: Date, action: string, { localizer }: any) => {
  switch (action) {
    case Navigate.PREVIOUS:
      return localizer.add(date, -3, "day");
    case Navigate.NEXT:
      return localizer.add(date, 3, "day");
    default:
      return date;
  }
};
ThreeDayView.title = (date: Date, { localizer }: any) => {
  const range = ThreeDayView.range(date, { localizer });
  const start = range[0];
  const end = range[range.length - 1];
  return localizer.format({ start, end }, "dayRangeHeaderFormat");
};

// Toolbar tuỳ biến: prev/next dạng icon ‹ ›, nút Hôm nay, và bộ chọn Tháng/Tuần/3 ngày/Ngày.
// (Toolbar mặc định của rbc bị ẩn bởi globals.css nên ta tự dựng cho hợp UI.)
const CalendarToolbar = ({ label, onNavigate, onView, view, views }: any) => {
  const t = useTranslations("Common");
  const navBtn =
    "w-8 h-8 flex items-center justify-center rounded-full bg-lucasSkyLight hover:bg-lucasSky text-gray-600";
  const viewLabels: Record<string, string> = {
    month: t("view_month"),
    week: t("view_week"),
    threeDay: t("view_3day"),
    day: t("view_day"),
  };
  const viewKeys: string[] = Array.isArray(views) ? views : Object.keys(views);
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onNavigate("PREV")} className={navBtn} aria-label={t("prev")}>
          ‹
        </button>
        <button
          type="button"
          onClick={() => onNavigate("TODAY")}
          className="px-3 h-8 rounded-full bg-lucasPurpleLight hover:bg-lucasPurple text-sm text-gray-600"
        >
          {t("today")}
        </button>
        <button type="button" onClick={() => onNavigate("NEXT")} className={navBtn} aria-label={t("next")}>
          ›
        </button>
      </div>

      <span className="font-semibold text-gray-700">{label}</span>

      <div className="flex items-center gap-1 text-sm">
        {viewKeys.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            className={`px-3 h-8 rounded-md ${
              view === v ? "bg-lucasPurple text-gray-800" : "bg-lucasPurpleLight text-gray-600"
            }`}
          >
            {viewLabels[v]}
          </button>
        ))}
      </div>
    </div>
  );
};

const BigCalendar = ({
  data,
  onSelectEvent,
  focusDate,
}: {
  data: { title: string; start: Date; end: Date; [key: string]: any }[];
  onSelectEvent?: (event: any) => void;
  focusDate?: Date; // vào từ nút "Xem" của 1 khoản học phí → mở sẵn đúng tháng đó
}) => {
  const appLocale = useLocale();
  moment.locale(appLocale === "vi" ? "vi" : "en");

  const [view, setView] = useState<View>(focusDate ? Views.MONTH : Views.WEEK);
  const [date, setDate] = useState<Date>(focusDate ?? new Date());

  // Màn hình hẹp (điện thoại) → mặc định xem 3 ngày, tránh 7 cột tuần bị bóp chật
  // mà vẫn thấy được nhiều hơn 1 ngày cùng lúc. Đổi được sang Tuần/Tháng/Ngày qua toolbar.
  useEffect(() => {
    if (!focusDate && window.innerWidth < 768) setView("threeDay" as View);
  }, [focusDate]);

  return (
    <Calendar
      localizer={localizer}
      events={data}
      startAccessor="start"
      endAccessor="end"
      // @types/react-big-calendar chưa biết view tuỳ biến (threeDay) — ép any cho riêng prop này.
      views={{ month: true, week: true, threeDay: ThreeDayView, day: true } as any}
      view={view}
      onView={(v) => setView(v)}
      date={date}
      onNavigate={(d) => setDate(d)}
      style={{ height: "100%" }}
      // Chỉ ép cuộn ngang (globals.css) khi xem Tuần (7 cột) — view 3-ngày/Ngày vừa khít, không cần.
      className={view === Views.WEEK ? "rbc-force-scroll" : ""}
      components={{ toolbar: CalendarToolbar }}
      onSelectEvent={(event) => onSelectEvent?.(event)}
      eventPropGetter={(event: any) => {
        if (event.isVirtual || event.attendable === false) {
          return {
            style: {
              backgroundColor: "#e5e7eb",
              color: "#6b7280",
              border: "1px dashed #9ca3af",
              cursor: "default",
            },
          };
        }
        const c = getClassColor(event.color);
        return { style: { backgroundColor: c.bg, border: "none", color: "#1f2937" } };
      }}
      formats={{
        dayFormat: "ddd DD/MM", // nhãn cột tuần: "Mon 04/08"
        dayHeaderFormat: "dddd DD/MM", // tiêu đề view Ngày
      }}
      min={new Date(2025, 1, 0, 8, 0, 0)}
      max={new Date(2025, 1, 0, 22, 0, 0)}
    />
  );
};

export default BigCalendar;
