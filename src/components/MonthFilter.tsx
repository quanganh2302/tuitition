"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

// Lọc theo tháng: ghi ?month=YYYY-MM vào URL (để trống = bỏ lọc, xem tất cả).
const MonthFilter = () => {
  const t = useTranslations("Common");
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("month") ?? "";
  const [pending, startTransition] = useTransition();

  const onChange = (v: string) => {
    const p = new URLSearchParams(Array.from(params.entries()));
    if (v) p.set("month", v);
    else p.delete("month");
    p.delete("page");
    startTransition(() => router.push(`?${p.toString()}`));
  };

  return (
    <div className="relative" aria-busy={pending}>
      {pending && (
        <span className="absolute -left-[18px] top-0 bottom-0 my-auto w-3.5 h-3.5 border-2 border-lucasPurple border-t-transparent rounded-full animate-spin" />
      )}
      <input
        type="month"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        title={t("filter_month")}
        className="ring-[1.5px] ring-gray-300 p-1.5 rounded-md text-sm"
      />
    </div>
  );
};

export default MonthFilter;
