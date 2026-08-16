"use client";

import { useFormState } from "react-dom";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setTuitionPaid } from "@/lib/actions";

// Nút đổi trạng thái đã đóng / chưa đóng của 1 khoản học phí.
const TuitionPaidToggle = ({ id, paid }: { id: string; paid: boolean }) => {
  const t = useTranslations("Common");
  const [state, formAction] = useFormState(setTuitionPaid, {
    success: false,
    error: false,
  });
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
    else if (state.error) toast.error((state as any).message || t("error_generic"));
  }, [state, router, t]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="paid" value={(!paid).toString()} />
      <button
        className={`px-2 py-1 rounded-md text-xs font-medium ${
          paid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {paid ? t("paid") : t("unpaid")}
      </button>
    </form>
  );
};

export default TuitionPaidToggle;
