"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { parentSchema, ParentSchema } from "@/lib/formValidationSchemas";
import InputField from "../InputField";
import Image from "next/image";
import { createParent, updateParent } from "@/lib/actions";
import { useFormState } from "react-dom";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const ParentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: Partial<ParentSchema>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const tf = useTranslations("Forms");
  const tc = useTranslations("Common");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ParentSchema>({
    resolver: zodResolver(parentSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createParent : updateParent,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((data) => {
    formAction(data);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(type === "create" ? tf("toast_parent_created") : tf("toast_parent_updated"));
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen, tf]);

  const students = relatedData?.students ?? [];

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? tf("parent_create") : tf("parent_update")}
      </h1>
      <span className="text-xs text-gray-400 font-medium">{tf("section_personal")}</span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label={tf("parent_name")}
          name="parentName"
          register={register}
          error={errors.parentName}
          defaultValue={data?.parentName}
        />
        <InputField
          label={tc("phone")}
          name="phone"
          register={register}
          error={errors.phone}
          defaultValue={data?.phone}

        />
        {data && (
          <InputField
            label="id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors.id}
            hidden
          />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{tf("student")}</label>
          <select
            multiple
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("students")}
            defaultValue={data?.students}
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">{tc("sex")}</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("sex")}
          >
            <option value="MALE">{tc("male")}</option>
            <option value="FEMALE">{tc("female")}</option>
          </select>
          {errors.sex && (
            <p className="text-xs text-red-400">{errors.sex.message}</p>
          )}
        </div>
      </div>
      {state.error && (
        <span className="text-red-500">
          {(state as any).message || tc("error_generic")}
        </span>
      )}
      <button
        className="bg-blue-400 text-white p-2 rounded-md"
      >
        {type === "create" ? tc("create") : tc("update")}
      </button>
    </form>
  );
};

export default ParentForm;
