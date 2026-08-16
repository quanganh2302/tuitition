"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { StudentSchema, studentSchema } from "@/lib/formValidationSchemas";
import InputField from "../InputField";
import Image from "next/image";
import { createStudent, updateStudent } from "@/lib/actions";
import { useFormState } from "react-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
const StudentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: Partial<StudentSchema>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const tf = useTranslations("Forms");
  const tc = useTranslations("Common");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
  });
  const [state, formAction] = useFormState(
    type === "create" ? createStudent : updateStudent,
    {
      success: false,
      error: false,
    }
  );
  const [img, setImg] = useState<any>();

  const onSubmit = handleSubmit((data) => {
    formAction({ ...data, avatar: img?.secure_url });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(type === "create" ? tf("toast_student_created") : tf("toast_student_updated"));
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen, tf]);

  const { classes, teachers } = relatedData;
  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? tf("student_create") : tf("student_update")}
      </h1>
      <span className="text-xs text-gray-400 font-medium">{tf("section_personal")}</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={tf("student_name")}
          name="studentName"
          defaultValue={data?.studentName}
          register={register}
          error={errors.studentName}
        />
        <InputField
          label={tc("phone")}
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label={tc("address")}
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{tc("sex")}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("sex")}
            defaultValue={data?.sex}
          >
            <option value="MALE">{tc("male")}</option>
            <option value="FEMALE">{tc("female")}</option>
          </select>
          {errors.sex && (
            <p className="text-xs text-red-400">{errors.sex.message}</p>
          )}
        </div>
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors.id}
            hidden
          />
        )}
      </div>

      <span className="text-xs text-gray-400 font-medium">{tf("section_class")}</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={tf("tuition_per_session")}
          name="tuition"
          type="number"
          defaultValue={
            data?.tuition !== undefined ? data.tuition.toString() : ""
          }
          register={register}
          error={errors.tuition}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{tf("lesson_type")}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("lessonType")}
            defaultValue={data?.lessonType}
          >
            <option value="CENTER">{tf("lesson_type_center")}</option>
            <option value="HOME">{tf("lesson_type_home")}</option>
          </select>
          {errors.lessonType && (
            <p className="text-xs text-red-400">{errors.lessonType.message}</p>
          )}
        </div>
        {/* Giáo viên phụ trách — chỉ admin mới chọn; teacher tạo là tự gán mình */}
        {teachers && (
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">{tf("owner_teacher")}</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("ownerTeacherId")}
              defaultValue={data?.ownerTeacherId}
            >
              <option value="">{tf("select_teacher")}</option>
              {teachers.map((t: { id: string; teacherName: string }) => (
                <option value={t.id} key={t.id}>
                  {t.teacherName}
                </option>
              ))}
            </select>
            {errors.ownerTeacherId && (
              <p className="text-xs text-red-400">
                {errors.ownerTeacherId.message}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{tf("classes")}</label>
          <select
            multiple
            size={4}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classes")}
            defaultValue={data?.classes?.map((c: any) =>
              typeof c === "string" ? c : c.id
            )}
          >
            {classes?.map((cls: { id: string; className: string }) => {
              return (
                <option value={cls.id} key={cls.id}>
                  {cls.className}
                </option>
              );
            })}
          </select>
          <p className="text-[11px] text-gray-400">{tf("classes_hint")}</p>
          {errors.classes?.message && (
            <p className="text-xs text-red-400">
              {errors.classes.message.toString()}
            </p>
          )}
        </div>
      </div>

      <span className="text-xs text-gray-400 font-medium">{tf("section_other")}</span>
      <div className="flex items-center flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-600 ring-[1.5px] ring-gray-300 rounded-md px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            {...register("isStudying")}
            className="w-4 h-4 accent-lucasPurple"
            defaultChecked={data?.isStudying ?? false}
          />
          {tf("is_studying")}
        </label>
        {errors.isStudying && (
          <p className="text-xs text-red-400">{errors.isStudying.message}</p>
        )}
        <CldUploadWidget
          uploadPreset="diemDanh"
          onSuccess={(result, { widget }) => {
            setImg(result.info);
            widget.close();
          }}
        >
          {({ open }) => {
            return (
              <div
                className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
                onClick={() => open()}
              >
                <Image src="/upload.png" alt="" width={28} height={28} />
                <span>{tc("upload_photo")}</span>
              </div>
            );
          }}
        </CldUploadWidget>
      </div>
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

export default StudentForm;
