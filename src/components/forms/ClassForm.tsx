"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { classSchema, ClassSchema } from "@/lib/formValidationSchemas";
import { createClass, updateClass, checkTeacherConflict } from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CLASS_COLORS, DEFAULT_PRIVATE_COLOR } from "@/lib/classColors";

type Conflict = {
  id: string;
  className: string;
  startTime: string;
  endTime: string;
  endDate: string | null;
};

const ClassForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const tf = useTranslations("Forms");
  const tc = useTranslations("Common");
  const td = useTranslations("Days");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClassSchema>({
    resolver: zodResolver(classSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createClass : updateClass,
    { success: false, error: false }
  );

  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [override, setOverride] = useState(false);
  // Lớp nhóm theo sĩ số (D2): không roster, lưu base + rate/HS.
  const [group, setGroup] = useState<boolean>(data?.groupBasePerSession != null);
  // Màu lịch — chỉ áp cho lớp PRIVATE (lớp CENTER dùng chung 1 màu mặc định, chưa cho chọn riêng).
  const [color, setColor] = useState<string>(data?.color || DEFAULT_PRIVATE_COLOR);
  const wType = watch("type");

  // Kiểm trùng lịch dạy khi đổi thứ/giờ/GV (báo mềm, không chặn cứng).
  const wDate = watch("date");
  const wStart = watch("startTime");
  const wEnd = watch("endTime");
  const wTeacher = watch("teacherId");
  useEffect(() => {
    if (!wDate || !wStart || !wEnd) {
      setConflicts([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      const res = await checkTeacherConflict({
        id: data?.id,
        teacherId: wTeacher,
        date: wDate,
        startTime: wStart,
        endTime: wEnd,
      });
      if (active) setConflicts(res.conflicts);
    }, 400);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [wDate, wStart, wEnd, wTeacher, data?.id]);

  const onSubmit = handleSubmit((formData) => {
    if (conflicts.length > 0 && !override) {
      toast.error(tf("conflict"));
      return;
    }
    formAction(
      group
        ? { ...formData, isGroup: true, type: "CENTER", students: [] }
        : { ...formData, color }
    );
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(type === "create" ? tf("toast_class_created") : tf("toast_class_updated"));
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen, tf]);

  const { students, teachers } = relatedData;
  const days = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];
  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? tf("class_create") : tf("class_update")}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={tf("class_name")}
          name="className"
          defaultValue={data?.className}
          register={register}
          error={errors?.className}
        />
        {/* Toggle lớp nhóm theo sĩ số */}
        <label className="w-full flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} className="w-4 h-4" />
          {tf("group_mode")}
        </label>
        {group ? (
          <>
            <InputField
              label={tf("group_base")}
              name="groupBasePerSession"
              type="number"
              defaultValue={data?.groupBasePerSession?.toString() ?? "0"}
              register={register}
              error={errors.groupBasePerSession}
            />
            <InputField
              label={tf("group_rate")}
              name="groupRatePerStudent"
              type="number"
              defaultValue={data?.groupRatePerStudent?.toString() ?? "0"}
              register={register}
              error={errors.groupRatePerStudent}
            />
          </>
        ) : (
          /* Loại lớp */
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">{tf("class_type")}</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("type")}
              defaultValue={data?.type}
            >
              <option value="CENTER">{tf("class_type_center")}</option>
              <option value="PRIVATE">{tf("class_type_private")}</option>
            </select>
            {errors.type?.message && (
              <p className="text-xs text-red-400">{errors.type.message}</p>
            )}
          </div>
        )}
        {/* Màu lịch — chỉ lớp PRIVATE mới chọn được; lớp CENTER dùng chung 1 màu mặc định */}
        {!group && wType !== "CENTER" && (
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">{tf("class_color")}</label>
            <div className="flex items-center gap-2 h-[38px]">
              {CLASS_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColor(c.key)}
                  aria-label={c.key}
                  className={`w-6 h-6 rounded-full ring-2 ${
                    color === c.key ? "ring-gray-500" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
            </div>
          </div>
        )}
        {/* Giáo viên phụ trách — chỉ admin mới chọn; teacher tạo lớp là tự gán mình */}
        {teachers && (
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">{tf("teacher")}</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("teacherId")}
              defaultValue={data?.teacherId}
            >
              <option value="">{tf("select_teacher")}</option>
              {teachers.map((t: { id: string; teacherName: string }) => (
                <option value={t.id} key={t.id}>
                  {t.teacherName}
                </option>
              ))}
            </select>
            {errors.teacherId?.message && (
              <p className="text-xs text-red-400">{errors.teacherId.message}</p>
            )}
          </div>
        )}
        {/* Thứ trong tuần */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{tf("day")}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("date")}
            defaultValue={data?.date}
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {td(day)}
              </option>
            ))}
          </select>
          {errors.date?.message && (
            <p className="text-xs text-red-400">{errors.date.message}</p>
          )}
        </div>
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
        <InputField
          label={tf("start_time")}
          name="startTime"
          type="time"
          defaultValue={
            data?.startTime
              ? new Date(data.startTime).toISOString().slice(11, 16)
              : undefined
          }
          register={register}
          error={errors?.startTime}
        />
        <InputField
          label={tf("end_time")}
          name="endTime"
          type="time"
          defaultValue={
            data?.endTime
              ? new Date(data.endTime).toISOString().slice(11, 16)
              : undefined
          }
          register={register}
          error={errors?.endTime}
        />
        {/* Ngày kết thúc lớp — để trống = đang học; nhập ngày = dừng sinh buổi sau ngày đó */}
        <InputField
          label={tf("end_date")}
          name="endDate"
          type="date"
          defaultValue={
            data?.endDate
              ? new Date(data.endDate).toLocaleDateString("en-CA", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })
              : undefined
          }
          register={register}
          error={errors?.endDate}
        />
        {!group && (
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">{tf("student")}</label>
            <select
              multiple
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("students")}
              defaultValue={data?.students?.map((s: any) =>
                typeof s === "string" ? s : s.id
              )}
            >
              {students.map((student: { id: string; studentName: string }) => (
                <option value={student.id} key={student.id}>
                  {student.studentName}
                </option>
              ))}
            </select>
            {errors.students && (
              <p className="text-xs text-red-400">{errors.students.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Cảnh báo trùng lịch dạy — buộc tick xác nhận mới cho lưu */}
      {conflicts.length > 0 && (
        <div className="border border-red-300 bg-red-50 rounded-md p-3 text-sm">
          <p className="font-medium text-red-600">{tf("conflict_heading")}</p>
          <ul className="list-disc ml-5 text-red-500 mt-1">
            {conflicts.map((c) => (
              <li key={c.id}>
                {c.className} — {c.startTime}–{c.endTime}{" "}
                {c.endDate ? tf("conflict_until", { date: c.endDate }) : tf("conflict_ongoing")}
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 mt-2 text-red-600 cursor-pointer">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="w-4 h-4"
            />
            {tf("conflict_override")}
          </label>
        </div>
      )}

      {state.error && (
        <span className="text-red-500">
          {(state as any).message || tc("error_generic")}
        </span>
      )}
      <button className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? tc("create") : tc("update")}
      </button>
    </form>
  );
};

export default ClassForm;
