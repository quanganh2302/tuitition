"use client";

import { useSignUp } from "@clerk/nextjs";
import { provisionAccount } from "@/lib/actions";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

// Đăng ký công khai (Phase C). Chọn loại tài khoản: Trung tâm / Giáo viên solo.
// Luồng: signUp.create (email+username+mật khẩu) → XÁC MINH EMAIL bằng mã (email_code) →
//        setActive(session) → provisionAccount (tạo org+role+Teacher) → setActive(organization) →
//        hard reload /admin. Xem docs/DESIGN-multi-tenant.md.
const SignUpPage = () => {
  const t = useTranslations("Auth");
  const { isLoaded, signUp, setActive } = useSignUp();
  const [type, setType] = useState<"center" | "solo">("center");
  const [orgName, setOrgName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [sex, setSex] = useState<"MALE" | "FEMALE">("MALE");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerify, setPendingVerify] = useState(false); // đã gửi mã, chờ nhập
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Bước 1: tạo signUp + gửi mã xác minh về email (KHÔNG hoàn tất đăng ký ở đây).
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setErr("");
    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        username,
        password,
        unsafeMetadata: { accountType: type, orgName, teacherName, sex },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerify(true);
      setLoading(false);
    } catch (e: any) {
      setErr(
        e?.errors?.[0]?.longMessage ||
          e?.errors?.[0]?.message ||
          t("signup_failed")
      );
      setLoading(false);
    }
  };

  // Bước 2: nhập mã → xác minh email → hoàn tất + provision (org/role/Teacher).
  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || loading) return;
    setErr("");
    setLoading(true);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code });
      if (res.status !== "complete" || !res.createdSessionId) {
        setErr(t("signup_incomplete"));
        setLoading(false);
        return;
      }
      await setActive({ session: res.createdSessionId });
      const prov = await provisionAccount();
      if (!prov.success) {
        setErr(prov.message);
        setLoading(false);
        return;
      }
      // Reload để token mới nạp publicMetadata (role + orgId) provisionAccount vừa set → getScope đọc được.
      // (setActive organization chỉ để tiện; scoping đọc orgId từ publicMetadata, không cần active org.)
      await setActive({ session: res.createdSessionId, organization: prov.orgId });
      window.location.href = "/admin";
    } catch (e: any) {
      setErr(
        e?.errors?.[0]?.longMessage ||
          e?.errors?.[0]?.message ||
          t("verify_failed")
      );
      setLoading(false);
    }
  };

  // Màn nhập mã xác minh email.
  if (pendingVerify) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lucasSkyLight py-10">
        <form
          onSubmit={verify}
          className="bg-white p-12 rounded-md shadow-2xl flex flex-col gap-3 w-[360px]"
        >
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Image src="/logo.png" alt="" width={24} height={24} />
            {t("verify_title")}
          </h1>
          <p className="text-gray-400 text-sm">{t("verify_subtitle", { email })}</p>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">{t("verify_code")}</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              className="p-2 rounded-md ring-1 ring-gray-300 text-sm tracking-widest"
            />
          </label>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button
            disabled={loading}
            className="bg-blue-500 text-white my-1 rounded-md text-sm p-[10px] disabled:opacity-60"
          >
            {loading ? t("verifying") : t("verify_submit")}
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingVerify(false);
              setCode("");
              setErr("");
            }}
            className="text-xs text-gray-500 text-center hover:underline"
          >
            {t("verify_back")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-lucasSkyLight py-10">
      <form
        onSubmit={submit}
        className="bg-white p-12 rounded-md shadow-2xl flex flex-col gap-3 w-[360px]"
      >
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Image src="/logo.png" alt="" width={24} height={24} />
          {t("signup_title")}
        </h1>
        <h2 className="text-gray-400 text-sm">{t("signup_subtitle")}</h2>

        {/* Loại tài khoản */}
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setType("center")}
            className={`flex-1 text-sm p-2 rounded-md ring-1 ${
              type === "center" ? "ring-lucasSky bg-lucasSkyLight font-medium" : "ring-gray-300"
            }`}
          >
            {t("type_center")}
          </button>
          <button
            type="button"
            onClick={() => setType("solo")}
            className={`flex-1 text-sm p-2 rounded-md ring-1 ${
              type === "solo" ? "ring-lucasSky bg-lucasSkyLight font-medium" : "ring-gray-300"
            }`}
          >
            {t("type_solo")}
          </button>
        </div>
        <p className="text-[11px] text-gray-400 -mt-1">
          {type === "center" ? t("hint_center") : t("hint_solo")}
        </p>

        {type === "center" ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">{t("center_name")}</span>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="p-2 rounded-md ring-1 ring-gray-300 text-sm"
              placeholder={t("center_name_ph")}
            />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">{t("your_name")}</span>
              <input
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                className="p-2 rounded-md ring-1 ring-gray-300 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">{t("sex")}</span>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as "MALE" | "FEMALE")}
                className="p-2 rounded-md ring-1 ring-gray-300 text-sm"
              >
                <option value="MALE">{t("male")}</option>
                <option value="FEMALE">{t("female")}</option>
              </select>
            </label>
          </>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t("email")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="p-2 rounded-md ring-1 ring-gray-300 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t("username")}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="p-2 rounded-md ring-1 ring-gray-300 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t("password")}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="p-2 rounded-md ring-1 ring-gray-300 text-sm"
          />
        </label>

        {err && <p className="text-xs text-red-400">{err}</p>}

        <button
          disabled={loading}
          className="bg-blue-500 text-white my-1 rounded-md text-sm p-[10px] disabled:opacity-60"
        >
          {loading ? t("creating") : t("sign_up")}
        </button>

        <Link href="/" className="text-xs text-gray-500 text-center hover:underline">
          {t("have_account")}
        </Link>
      </form>
    </div>
  );
};

export default SignUpPage;
