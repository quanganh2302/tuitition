import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import SignedOutRedirect from "@/components/SignedOutRedirect";
import SupportHub from "@/components/SupportHub";
import { getScope } from "@/lib/scope";
import { UserButton } from "@clerk/nextjs";
import { clerkClient } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";

// Trung tâm bị super-admin khoá → chặn truy cập (cờ suspended trên org publicMetadata).
// Cache 60s: tránh gọi API Clerk sống trên MỖI lần điều hướng (đang chặn cả layout, kể cả
// loading.tsx, hiện ra — cache giúp hầu hết lần vào trang không phải chờ round-trip này).
const fetchOrgSuspended = unstable_cache(
  async (orgId: string) => {
    try {
      const org = await clerkClient.organizations.getOrganization({ organizationId: orgId });
      return (org.publicMetadata as { suspended?: boolean })?.suspended === true;
    } catch {
      return false; // không chặn nếu tra cứu lỗi
    }
  },
  ["org-suspended-check"],
  { revalidate: 60 }
);

const isOrgSuspended = async (orgId: string | null | undefined) => {
  if (!orgId) return false;
  return fetchOrgSuspended(orgId);
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { orgId } = getScope();
  if (await isOrgSuspended(orgId)) {
    const ts = await getTranslations("Suspended");
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-lucasSkyLight text-center p-6">
        <SignedOutRedirect />
        <Image src="/logo.png" alt="" width={40} height={40} />
        <h1 className="text-xl font-bold">{ts("title")}</h1>
        <p className="text-sm text-gray-500 max-w-sm">{ts("message")}</p>
        <UserButton />
      </div>
    );
  }
  return (
    <div className="h-screen flex">
      <SignedOutRedirect />
      {/* LEFT */}
      <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4 flex flex-col h-full">
        <Link
          href="/"
          className="flex items-center justify-center lg:justify-start gap-2"
        >
          <Image src="/logo.png" alt="logo" width={32} height={32} />
          <span className="hidden lg:block font-bold">SchooLucas</span>
        </Link>
        <Menu />
      </div>
      {/* RIGHT */}
      <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] overflow-hidden flex flex-col">
        <Navbar />
        {/* Khung bao giới hạn chiều cao còn lại (sidebar + navbar đứng yên). overflow-auto để làm
            lưới an toàn: các trang có bảng riêng (đã tự cuộn bên trong card) không kích hoạt cuộn ở
            đây; các trang khác (dashboard, chi tiết GV/HS, form...) không tự quản cuộn thì vẫn cuộn
            được bình thường thay vì bị cắt mất nội dung tràn màn hình. */}
        <div className="flex-1 min-h-0 overflow-auto flex flex-col">{children}</div>
      </div>
      <SupportHub />
    </div>
  );
}
