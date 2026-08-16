"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

// classCountByWeekday[getDay()] = số lớp (đang hoạt động) học vào thứ đó.
const EventCalendar = ({
  classCountByWeekday = [],
}: {
  classCountByWeekday?: number[];
}) => {
  const [value, onChange] = useState<Value>(new Date());
  const router = useRouter();

  useEffect(() => {
    if (value instanceof Date) {
      router.push(`?date=${value}`);
    }
  }, [value, router]);

  return (
    <Calendar
      onChange={onChange}
      value={value}
      tileContent={({ date, view }) => {
        if (view !== "month") return null;
        const c = classCountByWeekday[date.getDay()] || 0;
        if (!c) return null;
        return (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full bg-lucasPurple text-purple-800 text-[9px] leading-none font-semibold">
            {c}
          </span>
        );
      }}
    />
  );
};

export default EventCalendar;
