"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

// Nút sort: đảo chiều asc/desc qua URL (?sort=). Mỗi trang tự chọn cột để orderBy theo chiều này.
const SortButton = () => {
  const t = useTranslations("Common");
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("sort");
  const next = current === "asc" ? "desc" : "asc";

  const onClick = () => {
    const p = new URLSearchParams(Array.from(params.entries()));
    p.set("sort", next);
    p.delete("page");
    router.push(`?${p.toString()}`);
  };

  return (
    <button
      onClick={onClick}
      title={next === "asc" ? t("sort_old_new") : t("sort_new_old")}
      className="w-8 h-8 flex items-center justify-center rounded-full bg-lucasYellow"
    >
      <Image src="/sort.png" alt={t("sort")} width={14} height={14} />
    </button>
  );
};

export default SortButton;
