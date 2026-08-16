"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

// Search realtime theo tên: cập nhật ?search= khi gõ (debounce), giữ nguyên các param khác, về trang 1.
const TableSearch = () => {
  const t = useTranslations("Common");
  const router = useRouter();
  const params = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const push = (value: string) => {
    const p = new URLSearchParams(Array.from(params.entries()));
    if (value) p.set("search", value);
    else p.delete("search");
    p.delete("page");
    router.push(`?${p.toString()}`);
  };

  const onChange = (value: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => push(value), 350);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        push((e.currentTarget[0] as HTMLInputElement).value);
      }}
      className="w-full md:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2"
    >
      <Image src="/search.png" alt="" width={14} height={14} />
      <input
        type="text"
        placeholder={t("search_by_name")}
        defaultValue={params.get("search") ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-[200px] p-2 bg-transparent outline-none"
      />
    </form>
  );
};

export default TableSearch;
