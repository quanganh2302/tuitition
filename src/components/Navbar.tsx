import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { getScope, orgWhere } from "@/lib/scope";
import { Prisma } from "@prisma/client";
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationBell, { type UnpaidItem } from "./NotificationBell";

const Navbar = async () => {
  const user = await currentUser();
  const scope = getScope();
  const t = await getTranslations("Navbar");
  const locale = cookies().get("locale")?.value ?? "vi";

  // Tên hiển thị: ưu tiên teacherName (solo/GV), rồi firstName/username của Clerk.
  const self = scope.userId
    ? await prisma.teacher.findUnique({
        where: { id: scope.userId },
        select: { teacherName: true },
      })
    : null;
  const displayName =
    self?.teacherName || user?.firstName || user?.username || t("default_user");

  // Thông báo = học phí CHƯA ĐÓNG (scope org; teacher = HS mình phụ trách).
  const isStaff = scope.role === "admin" || scope.role === "teacher";
  let items: UnpaidItem[] = [];
  let unpaidCount = 0;
  if (isStaff) {
    const where: Prisma.MonthlyTuitionWhereInput = {
      ...orgWhere(scope),
      paidStatus: "UNPAID",
      ...(scope.role === "teacher"
        ? { student: { ownerTeacherId: scope.userId! } }
        : {}),
    };
    const [rows, count] = await prisma.$transaction([
      prisma.monthlyTuition.findMany({
        where,
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { studentName: true } },
          class: { select: { className: true } },
        },
      }),
      prisma.monthlyTuition.count({ where }),
    ]);
    items = rows.map((r) => ({
      id: r.id,
      studentName: r.student.studentName,
      className: r.class.className,
      month: r.month,
      year: r.year,
      amount: r.totalAmount,
    }));
    unpaidCount = count;
  }

  return (
    <div className="flex items-center justify-between p-4">
      {/* SEARCH BAR */}
      <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
        <Image src="/search.png" alt="" width={14} height={14} />
        <input
          type="text"
          placeholder={t("search")}
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </div>
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <LanguageSwitcher current={locale} />
        <NotificationBell items={items} count={unpaidCount} />
        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium">{displayName}</span>
          <span className="text-[10px] text-gray-500 text-right">
            {scope.role ? t(`role_${scope.role}`) : ""}
          </span>
        </div>
        <UserButton />
      </div>
    </div>
  );
};

export default Navbar;
