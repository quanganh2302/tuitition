"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import AttendanceGauge from "./AttendanceGauge";

type S = { id: string; name: string; present: number; total: number };

// Widget "Chuyên cần học viên" (trang GV): chọn 1 HS (ô tìm + select) → gauge % có mặt.
const StudentAttendanceGauge = ({ students }: { students: S[] }) => {
  const t = useTranslations("TeacherDetail");
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState(students[0]?.id ?? "");

  const filtered = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase())),
    [students, q]
  );
  const cur = students.find((s) => s.id === selId) ?? students[0];

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl w-full p-4 flex flex-col">
        <h1 className="text-lg font-semibold">{t("attendance_widget_title")}</h1>
        <p className="text-sm text-gray-400 m-auto">{t("no_students")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl w-full p-4 flex flex-col">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">{t("attendance_widget_title")}</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>

      {/* Ô tìm + select chọn học viên */}
      <div className="flex gap-2 mt-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search_student")}
          className="flex-1 min-w-0 text-sm p-1.5 rounded-md ring-1 ring-gray-300 outline-none"
        />
        <select
          value={selId}
          onChange={(e) => setSelId(e.target.value)}
          className="text-sm p-1.5 rounded-md ring-1 ring-gray-300 max-w-[45%]"
          aria-label={t("select_student")}
        >
          {filtered.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <AttendanceGauge
        present={cur?.present ?? 0}
        total={cur?.total ?? 0}
        centerLabel={cur?.name}
        presentLabel={t("present_label")}
        absentLabel={t("absent_label")}
      />
    </div>
  );
};

export default StudentAttendanceGauge;
