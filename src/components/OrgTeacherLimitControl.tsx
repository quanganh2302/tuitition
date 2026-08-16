"use client";

import { setOrgTeacherLimit } from "@/lib/actions";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Nút đặt hạn mức GV cho 1 trung tâm (super-admin, trang /platform). Highlight khi trung tâm đã xin nâng.
const OrgTeacherLimitControl = ({
  orgId,
  limit,
  requested,
}: {
  orgId: string;
  limit: number;
  requested: boolean;
}) => {
  const t = useTranslations("Platform");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const setLimit = async () => {
    const input = window.prompt(t("set_limit_prompt"), String(limit));
    if (input == null) return;
    const n = Number(input);
    if (!Number.isInteger(n) || n < 1) {
      alert(t("action_failed"));
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("orgId", orgId);
    fd.set("limit", String(n));
    const res = await setOrgTeacherLimit({ success: false, error: false }, fd);
    setBusy(false);
    if (res.success) router.refresh();
    else alert(res.message || t("action_failed"));
  };

  return (
    <button
      onClick={setLimit}
      disabled={busy}
      className={`text-xs px-3 py-1 rounded-md disabled:opacity-60 ${
        requested ? "bg-amber-100 text-amber-700 font-semibold" : "bg-gray-100 text-gray-700"
      }`}
    >
      {busy ? "..." : requested ? t("upgrade_requested") : t("set_limit")}
    </button>
  );
};

export default OrgTeacherLimitControl;
