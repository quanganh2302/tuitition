"use client";

import { recordGroupSession } from "@/lib/actions";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

// Ghi 1 buổi LỚP NHÓM: nhập ngày + số HS → tự tính tiền (base + (SS−1)×rate), sửa tay được.
const GroupSessionForm = ({
  classId,
  className,
  base,
  rate,
}: {
  classId: string;
  className: string;
  base: number;
  rate: number;
}) => {
  const t = useTranslations("GroupSession");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [headcount, setHeadcount] = useState(1);
  const [pay, setPay] = useState(base);
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);

  const computed = base + Math.max(0, headcount - 1) * rate;
  useEffect(() => {
    if (!edited) setPay(computed);
  }, [computed, edited]);

  const submit = async () => {
    setBusy(true);
    const res = await recordGroupSession(
      { success: false, error: false },
      { classId, date, headcount: Number(headcount), pay: edited ? Number(pay) : undefined }
    );
    setBusy(false);
    if (res.success) {
      toast(t("saved"));
      setOpen(false);
      setEdited(false);
      router.refresh();
    } else {
      toast.error((res as any).message || t("failed"));
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 rounded-md bg-lucasSky whitespace-nowrap"
      >
        {t("record")}
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md p-6 w-[92%] md:w-[420px] flex flex-col gap-4">
            <h1 className="text-lg font-semibold">{t("title", { name: className })}</h1>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-gray-500">{t("date")}</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="p-2 rounded-md ring-1 ring-gray-300"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-gray-500">{t("headcount")}</span>
              <input
                type="number"
                min={0}
                value={headcount}
                onChange={(e) => setHeadcount(Math.max(0, Number(e.target.value)))}
                className="p-2 rounded-md ring-1 ring-gray-300"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-gray-500">{t("pay")}</span>
              <input
                type="number"
                min={0}
                value={pay}
                onChange={(e) => {
                  setEdited(true);
                  setPay(Math.max(0, Number(e.target.value)));
                }}
                className="p-2 rounded-md ring-1 ring-gray-300"
              />
              <span className="text-[11px] text-gray-400">{t("auto_hint")}</span>
            </label>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-md bg-slate-200 text-sm"
              >
                {t("cancel")}
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="px-3 py-1.5 rounded-md bg-blue-500 text-white text-sm disabled:opacity-60"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GroupSessionForm;
