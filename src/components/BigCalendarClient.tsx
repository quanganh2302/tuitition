"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import BigCalendar from "./BigCalender";
import LessonForm from "./forms/LessonForm";

// Bọc lịch: click 1 buổi ĐÃ diễn ra (buổi thật) → mở form điểm danh. Buổi tương lai (ảo) chỉ hiển thị.
const BigCalendarClient = ({
  events,
  focusDate,
}: {
  events: any[];
  focusDate?: Date;
}) => {
  const t = useTranslations("Dashboard");
  const [selected, setSelected] = useState<any>(null);

  const handleSelect = (e: any) => {
    if (e?.isVirtual || e?.attendable === false || !e?.id) {
      toast.info(t("session_future"));
      return;
    }
    setSelected(e);
  };

  return (
    <div className="h-full">
      <BigCalendar data={events} onSelectEvent={handleSelect} focusDate={focusDate} />

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="relative bg-white p-6 rounded-md w-[90%] md:w-[60%] lg:w-[40%] max-h-[90vh] overflow-y-auto shadow-lg">
            <LessonForm
              type="update"
              data={selected}
              setOpen={() => setSelected(null)}
            />
            <button
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 text-xl font-bold text-gray-600 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BigCalendarClient;
