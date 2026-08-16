"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Opt = { label: string; value: string }; // value "" = tất cả (xoá lọc)

// Nút filter: dropdown lọc theo 1 param (tiêu chí do trang truyền vào), cập nhật URL.
// Nhãn options do trang cha truyền (đã dịch sẵn).
const FilterMenu = ({ param, options }: { param: string; options: Opt[] }) => {
  const t = useTranslations("Common");
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = params.get(param) ?? "";

  // đóng khi click ra ngoài
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const apply = (value: string) => {
    const p = new URLSearchParams(Array.from(params.entries()));
    if (value) p.set(param, value);
    else p.delete(param);
    p.delete("page");
    router.push(`?${p.toString()}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-8 h-8 flex items-center justify-center rounded-full ${
          current ? "bg-lucasYellow ring-2 ring-yellow-400" : "bg-lucasYellow"
        }`}
        title={t("filter")}
      >
        <Image src="/filter.png" alt={t("filter")} width={14} height={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white shadow-md rounded-md border border-gray-100 z-20 min-w-[150px] text-sm overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value || "all"}
              onClick={() => apply(o.value)}
              className={`block w-full text-left px-3 py-2 hover:bg-lucasPurpleLight ${
                current === o.value ? "font-semibold bg-lucasPurpleLight" : ""
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterMenu;
