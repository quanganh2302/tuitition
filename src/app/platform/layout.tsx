import SignedOutRedirect from "@/components/SignedOutRedirect";
import { UserButton } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

// Khu super-admin (chủ hệ thống) — TÁCH khỏi (dashboard). Không sidebar GV/HS, không org.
export default async function PlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("Platform");
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <SignedOutRedirect />
      <header className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <h1 className="font-bold">{t("header")}</h1>
        </div>
        <UserButton />
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
