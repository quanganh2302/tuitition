"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { TeacherSchema, teacherSchema } from "@/lib/formValidationSchemas";
import InputField from "../InputField";
import Image from "next/image";
import { createTeacher, updateTeacher, requestTeacherLimit } from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";

const TeacherForm = ({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: Partial<TeacherSchema>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const t = useTranslations("Forms");
  const tc = useTranslations("Common");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createTeacher : updateTeacher,
    { success: false, error: false }
  );

  const [img, setImg] = useState<any>();
  const [reqBusy, setReqBusy] = useState(false);
  const [reqDone, setReqDone] = useState(false);

  const sendUpgradeRequest = async () => {
    setReqBusy(true);
    const res = await requestTeacherLimit();
    setReqBusy(false);
    if (res.success) setReqDone(true);
    else toast.error(res.message || tc("error_generic"));
  };

  const limitHit = (state as any).code === "LIMIT";

  const onSubmit = handleSubmit((formData) => {
    formAction({ ...formData, avatar: img?.secure_url ?? data?.avatar });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(type === "create" ? t("toast_teacher_created") : t("toast_teacher_updated"));
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen, t]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? t("teacher_create") : t("teacher_update")}
      </h1>

      <span className="text-xs text-gray-400 font-medium">{t("section_login")}</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={tc("username")}
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />
        <InputField
          label={tc("email")}
          name="email"
          type="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <InputField
          label={tc("password")}
          name="password"
          type="password"
          defaultValue={data?.password}
          register={register}
          error={errors?.password}
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">{t("section_personal")}</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={t("teacher_name")}
          name="teacherName"
          defaultValue={data?.teacherName}
          register={register}
          error={errors.teacherName}
        />
        <InputField
          label={tc("phone")}
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label={t("subject")}
          name="subject"
          defaultValue={data?.subject}
          register={register}
          error={errors.subject}
        />
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
        <CldUploadWidget
          uploadPreset="diemDanh"
          onSuccess={(result, { widget }) => {
            setImg(result.info);
            widget.close();
          }}
        >
          {({ open }) => (
            <div
              className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
              onClick={() => open()}
            >
              <Image src="/upload.png" alt="" width={28} height={28} />
              <span>{tc("upload_photo")}</span>
            </div>
          )}
        </CldUploadWidget>
      </div>

      <span className="text-xs text-gray-400 font-medium">{t("section_salary")}</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={t("rate_private")}
          name="privateRatePerSession"
          type="number"
          defaultValue={data?.privateRatePerSession?.toString() ?? "0"}
          register={register}
          error={errors.privateRatePerSession}
        />
        <InputField
          label={t("rate_center_base")}
          name="centerBasePerSession"
          type="number"
          defaultValue={data?.centerBasePerSession?.toString() ?? "0"}
          register={register}
          error={errors.centerBasePerSession}
        />
        <InputField
          label={t("rate_center_student")}
          name="centerRatePerStudent"
          type="number"
          defaultValue={data?.centerRatePerStudent?.toString() ?? "0"}
          register={register}
          error={errors.centerRatePerStudent}
        />
      </div>

      {state.error && !limitHit && (
        <span className="text-red-500">
          {(state as any).message || tc("error_generic")}
        </span>
      )}

      {limitHit && (
        <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          <span className="font-semibold text-amber-800">{t("limit_title")}</span>
          <span className="text-amber-700">{(state as any).message}</span>
          <span className="text-xs text-amber-600">{t("limit_desc")}</span>
          {reqDone ? (
            <span className="text-xs font-medium text-green-700">{t("limit_requested")}</span>
          ) : (
            <button
              type="button"
              onClick={sendUpgradeRequest}
              disabled={reqBusy}
              className="self-start rounded-md bg-amber-500 px-3 py-1.5 text-white disabled:opacity-60"
            >
              {reqBusy ? "..." : t("limit_request")}
            </button>
          )}
        </div>
      )}

      <button className="bg-blue-400 text-white p-2 rounded-md" disabled={limitHit}>
        {type === "create" ? tc("create") : tc("update")}
      </button>
    </form>
  );
};

export default TeacherForm;
