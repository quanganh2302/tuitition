"use client";

import { useFormState } from "react-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateMonthlyTuitionAmount } from "@/lib/actions";

// Sửa tay số tiền của 1 khoản học phí đã chốt (chốt học phí không tự tính lại khoản đã tồn tại).
const TuitionAmountEdit = ({ id, amount }: { id: string; amount: number }) => {
  const t = useTranslations("Common");
  const tt = useTranslations("Tuition");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(amount);
  const [state, formAction] = useFormState(updateMonthlyTuitionAmount, {
    success: false,
    error: false,
  });
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error((state as any).message || t("error_generic"));
    }
  }, [state, router, t]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-lucasSky"
      >
        <Image src="/update.png" alt={t("edit")} width={16} height={16} />
      </button>
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <form
            action={formAction}
            className="relative bg-white p-6 rounded-md w-[90%] md:w-[360px] shadow-lg flex flex-col gap-4"
          >
            <input type="hidden" name="id" value={id} />
            <label className="text-sm text-gray-500 flex flex-col gap-1">
              {tt("amount_label")}
              <input
                type="number"
                name="totalAmount"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                min={0}
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-black"
              />
            </label>
            <button className="bg-lucasYellow text-sm font-medium py-2 rounded-md">
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-xl font-bold text-gray-600 hover:text-red-500"
            >
              ✕
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default TuitionAmountEdit;
