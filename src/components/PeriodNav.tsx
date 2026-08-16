"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

// Pill điều hướng lướt theo chu kỳ (tuần/năm/...): ‹ resetLabel › — cùng style toolbar BigCalendar.
// `param` = tên query param lưu offset (vd "week", "year"); offset 0 = xoá param (mặc định hiện tại).
const PeriodNav = ({
  value,
  param,
  resetLabel,
}: {
  value: number;
  param: string;
  resetLabel: string;
}) => {
  const t = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 0) params.delete(param);
    else params.set(param, next.toString());
    router.push(`${pathname}?${params}`);
  };

  const navBtn =
    "w-7 h-7 flex items-center justify-center rounded-full bg-lucasSkyLight hover:bg-lucasSky text-gray-600";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => go(value - 1)} className={navBtn} aria-label={t("prev")}>
        ‹
      </button>
      <button
        type="button"
        onClick={() => go(0)}
        className="px-3 h-7 rounded-full bg-lucasPurpleLight hover:bg-lucasPurple text-xs text-gray-600"
      >
        {resetLabel}
      </button>
      <button type="button" onClick={() => go(value + 1)} className={navBtn} aria-label={t("next")}>
        ›
      </button>
    </div>
  );
};

export default PeriodNav;
