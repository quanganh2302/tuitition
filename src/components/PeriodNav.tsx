"use client";

import { useTransition } from "react";
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
  // loading.tsx không hiện khi chỉ đổi query param → tự báo đang tải; card cha mờ đi qua aria-busy.
  const [pending, startTransition] = useTransition();

  const go = (next: number) => {
    if (pending) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === 0) params.delete(param);
    else params.set(param, next.toString());
    startTransition(() => router.push(`${pathname}?${params}`));
  };

  const navBtn =
    "w-7 h-7 flex items-center justify-center rounded-full bg-lucasSkyLight hover:bg-lucasSky text-gray-600";

  return (
    <div className="flex items-center gap-2" aria-busy={pending}>
      <button type="button" onClick={() => go(value - 1)} className={navBtn} aria-label={t("prev")}>
        ‹
      </button>
      <button
        type="button"
        onClick={() => go(0)}
        className="relative px-3 h-7 rounded-full bg-lucasPurpleLight hover:bg-lucasPurple text-xs text-gray-600"
      >
        <span className={pending ? "invisible" : undefined}>{resetLabel}</span>
        {pending && (
          <span className="absolute inset-0 m-auto w-3.5 h-3.5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
        )}
      </button>
      <button type="button" onClick={() => go(value + 1)} className={navBtn} aria-label={t("next")}>
        ›
      </button>
    </div>
  );
};

export default PeriodNav;
