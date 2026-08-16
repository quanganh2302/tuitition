"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

// Lọc theo tháng: ghi ?month=YYYY-MM vào URL (để trống = bỏ lọc, xem tất cả).
const MonthFilter = () => {
  const t = useTranslations("Common");
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("month") ?? "";

  const onChange = (v: string) => {
    const p = new URLSearchParams(Array.from(params.entries()));
    if (v) p.set("month", v);
    else p.delete("month");
    p.delete("page");
    router.push(`?${p.toString()}`);
  };

  return (
    <input
      type="month"
      value={current}
      onChange={(e) => onChange(e.target.value)}
      title={t("filter_month")}
      className="ring-[1.5px] ring-gray-300 p-1.5 rounded-md text-sm"
    />
  );
};

export default MonthFilter;
