"use client";

import { markAttendance } from "@/lib/actions";
import { capitalizeFirst } from "@/lib/utils";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

type StudentRow = { id: string; studentName: string };

const LessonForm = ({
  data,
  setOpen,
}: {
  type?: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const tf = useTranslations("Forms");
  const tc = useTranslations("Common");
  const router = useRouter();
  const sessionId: string = data?.id;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string>("TAUGHT");
  const [isAdmin, setIsAdmin] = useState(false);
  const [teachers, setTeachers] = useState<
    { id: string; teacherName: string }[]
  >([]);
  const [taughtById, setTaughtById] = useState<string>("");

  const [state, formAction] = useFormState(markAttendance, {
    success: false,
    error: false,
  });

  // Nạp học sinh của lớp + điểm danh đã có
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/classSessions/attendance?sessionId=${sessionId}`
        );
        if (!res.ok) throw new Error(String(res.status));
        const d = await res.json();
        setStudents(d.students || []);
        setStatus(d.status || "TAUGHT");
        setIsAdmin(!!d.isAdmin);
        setTeachers(d.teachers || []);
        setTaughtById(d.taughtById || "");
        // Mặc định: đã có bản ghi → theo bản ghi; chưa có → mặc định Có mặt
        const p: Record<string, boolean> = {};
        for (const s of d.students || []) {
          p[s.id] = d.attendance?.[s.id]
            ? d.attendance[s.id] === "PRESENT"
            : true;
        }
        setPresent(p);
      } catch (e) {
        toast.error(tf("attendance_load_error"));
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, tf]);

  useEffect(() => {
    if (state.success) {
      toast(tf("attendance_saved"));
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error((state as any).message || tc("error_generic"));
    }
  }, [state, router, setOpen, tf, tc]);

  const handleSave = () => {
    formAction({
      sessionId,
      status: status as "UPCOMING" | "TAUGHT" | "CANCELED",
      // Chỉ gửi taughtById khi ở chế độ trung tâm (có ô gán dạy thay); solo bỏ qua.
      taughtById: isAdmin && teachers.length > 0 ? taughtById || null : undefined,
      attendance: students.map((s) => ({
        studentId: s.id,
        present: !!present[s.id],
      })),
    });
  };

  const dateLabel = data?.date
    ? capitalizeFirst(
        new Date(data.date).toLocaleDateString("vi-VN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Ho_Chi_Minh",
        })
      )
    : "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{tf("attendance_title")}</h1>
        <p className="text-sm text-gray-500">{dateLabel}</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">{tf("attendance_loading")}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-2 w-full md:w-1/3">
              <label className="text-xs text-gray-500">{tf("attendance_status")}</label>
              <select
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="TAUGHT">{tf("att_taught")}</option>
                <option value="UPCOMING">{tf("att_upcoming")}</option>
                <option value="CANCELED">{tf("att_canceled")}</option>
              </select>
            </div>

            {isAdmin && teachers.length > 0 && (
              <div className="flex flex-col gap-2 w-full md:w-1/3">
                <label className="text-xs text-gray-500">
                  {tf("substitute_teacher")}
                </label>
                <select
                  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                  value={taughtById}
                  onChange={(e) => setTaughtById(e.target.value)}
                >
                  <option value="">{tf("substitute_default")}</option>
                  {teachers.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.teacherName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              {tf("present_count", {
                present: students.filter((s) => present[s.id]).length,
                total: students.length,
              })}
            </label>
            {students.length === 0 ? (
              <p className="text-sm text-gray-400">{tf("no_students")}</p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-md">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50"
                  >
                    <span className="text-sm">{s.studentName}</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={!!present[s.id]}
                      onChange={(e) =>
                        setPresent((prev) => ({
                          ...prev,
                          [s.id]: e.target.checked,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            className="bg-blue-500 text-white p-2 rounded-md"
          >
            {tf("save_attendance")}
          </button>
        </>
      )}
    </div>
  );
};

export default LessonForm;
