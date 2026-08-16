"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type UnpaidItem = {
  id: string;
  studentName: string;
  className: string;
  month: number;
  year: number;
  amount: number;
};

// Chuông thông báo = các khoản HỌC PHÍ CHƯA ĐÓNG (scope theo org/GV, tính ở Navbar).
const NotificationBell = ({ items, count }: { items: UnpaidItem[]; count: number }) => {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Notifications");
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
        title={t("title", { count })}
      >
        <Image src="/announcement.png" alt="Thông báo" width={20} height={20} />
        {count > 0 && (
          <span className="absolute -top-3 -right-3 min-w-[20px] h-5 px-1 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-20 p-2 text-sm">
            <div className="px-2 py-1 font-semibold border-b border-gray-100">
              {t("title", { count })}
            </div>
            {items.length === 0 ? (
              <p className="px-2 py-3 text-gray-400 text-xs">{t("empty")}</p>
            ) : (
              items.map((it) => (
                <Link
                  key={it.id}
                  href="/list/announcements?paid=UNPAID"
                  onClick={() => setOpen(false)}
                  className="block px-2 py-2 hover:bg-lucasSkyLight rounded"
                >
                  <div className="font-medium">{it.studentName}</div>
                  <div className="text-xs text-gray-500">
                    {t("item_meta", {
                      className: it.className,
                      month: it.month,
                      year: it.year,
                      amount: it.amount,
                    })}
                  </div>
                </Link>
              ))
            )}
            {count > items.length && (
              <Link
                href="/list/announcements?paid=UNPAID"
                onClick={() => setOpen(false)}
                className="block px-2 py-2 text-center text-xs text-blue-500 hover:underline border-t border-gray-100"
              >
                {t("view_all")}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
