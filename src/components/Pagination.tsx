"use client";

import { ITEM_PER_PAGE } from "@/lib/settings";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

// Cửa sổ số trang quanh trang hiện tại + luôn có trang đầu/cuối, chỗ hụt thay bằng "…".
const getPageList = (current: number, total: number): (number | "...")[] => {
  const pages: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) pages.push(i);
  }
  const result: (number | "...")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (prev && p - prev > 1) result.push("...");
    result.push(p);
    prev = p;
  }
  return result;
};

const Pagination = ({ page, count }: { page: number; count: number }) => {
  const t = useTranslations("Common");
  const router = useRouter();

  const totalPages = Math.ceil(count / ITEM_PER_PAGE);
  const hasPrev = ITEM_PER_PAGE * (page - 1) > 0;
  const hasNext = ITEM_PER_PAGE * (page - 1) + ITEM_PER_PAGE < count;

  const changePage = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    router.push(`${window.location.pathname}?${params}`);
  };
  return (
    <div className="p-4 mt-auto shrink-0 flex items-center justify-between text-gray-500">
      <button
        disabled={!hasPrev}
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => {
          changePage(page - 1);
        }}
      >
        {t("prev")}
      </button>
      <div className="flex items-center gap-2 text-sm">
        {getPageList(page, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`px-2 rounded-sm ${
                page === p ? "bg-lucasSky" : ""
              }`}
              onClick={() => {
                changePage(p);
              }}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        className="py-2 px-4 rounded-md bg-slate-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!hasNext}
        onClick={() => {
          changePage(page + 1);
        }}
      >
        {t("next")}
      </button>
    </div>
  );
};

export default Pagination;
