"use client";

import { setOrgSuspended } from "@/lib/actions";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Nút Khoá/Mở khoá 1 trung tâm (super-admin, trang /platform).
const OrgSuspendToggle = ({ orgId, suspended }: { orgId: string; suspended: boolean }) => {
  const t = useTranslations("Platform");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    const fd = new FormData();
    fd.set("orgId", orgId);
    fd.set("suspended", String(!suspended));
    const res = await setOrgSuspended({ success: false, error: false }, fd);
    setBusy(false);
    if (res.success) router.refresh();
    else alert(res.message || t("action_failed"));
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`text-xs px-3 py-1 rounded-md disabled:opacity-60 ${
        suspended ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {busy ? "..." : suspended ? t("unlock") : t("lock")}
    </button>
  );
};

export default OrgSuspendToggle;
