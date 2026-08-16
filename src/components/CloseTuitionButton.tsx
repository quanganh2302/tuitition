"use client";

import { useFormState } from "react-dom";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { closeMonthlyTuition } from "@/lib/actions";

// Nút chốt học phí — luôn chốt THÁNG HIỆN TẠI (sinh khoản MonthlyTuition cho HV/lớp chưa từng
// được chốt tháng này). Không chọn tháng khác ở đây — lọc/xem tháng khác dùng MonthFilter riêng.
const CloseTuitionButton = () => {
  const t = useTranslations("Dashboard");
  const tt = useTranslations("Tuition");
  const [state, formAction] = useFormState(closeMonthlyTuition, {
    success: false,
    error: false,
    message: "",
  });
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success((state as any).message || t("close_tuition_done"));
      router.refresh();
    } else if (state.error) {
      toast.error((state as any).message || t("close_tuition_failed"));
    }
  }, [state, router, t]);

  const onClick = () => {
    const now = new Date();
    formAction({ year: now.getFullYear(), month: now.getMonth() + 1 });
  };

  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-md bg-lucasYellow text-sm font-medium whitespace-nowrap"
    >
      {tt("close_month")}
    </button>
  );
};

export default CloseTuitionButton;
