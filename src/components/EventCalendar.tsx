"use client";

import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

// Màu badge theo số lượng, dải lạnh → nóng: 1=xanh dương ... 5=đỏ nhạt, >5=đỏ đậm (báo "rất nhiều").
const BADGE_COLORS = [
  "bg-lucasSky text-sky-800",
  "bg-lucasGreen text-green-800",
  "bg-lucasYellow text-yellow-800",
  "bg-lucasOrange text-orange-800",
  "bg-lucasRed text-red-800",
];
const badgeClass = (count: number) =>
  count > 5 ? "bg-lucasRedDark text-white" : BADGE_COLORS[count - 1];

// classCountByWeekday[getDay()] = số lớp (đang hoạt động) học vào thứ đó.
const EventCalendar = ({
  classCountByWeekday = [],
}: {
  classCountByWeekday?: number[];
}) => {
  const [value, onChange] = useState<Value>(new Date());

  return (
    <Calendar
      onChange={onChange}
      value={value}
      tileContent={({ date, view }) => {
        if (view !== "month") return null;
        const c = classCountByWeekday[date.getDay()] || 0;
        if (!c) return null;
        return (
          <span
            className={`absolute top-1 right-1 flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full text-[9px] leading-none font-semibold ${badgeClass(c)}`}
          >
            {c}
          </span>
        );
      }}
    />
  );
};

export default EventCalendar;
