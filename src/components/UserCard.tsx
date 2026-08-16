import prisma from "@/lib/prisma";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

const UserCard = async ({
  type,
}: {
  type: "admin" | "teacher" | "student" | "parent";
}) => {
  const scope = getScope();
  const t = await getTranslations("Dashboard");
  // Admin (model legacy) không có orgId → không lọc; còn lại lọc theo trung tâm.
  const org = type === "admin" ? {} : orgWhere(scope);

  const modelMap: Record<typeof type, any> = {
    admin: prisma.admin,
    teacher: prisma.teacher,
    student: prisma.student,
    parent: prisma.parent,
  };

  const data = await modelMap[type].count({ where: org });

  // Chỉ số phụ có ích theo loại thẻ (thay cho badge năm vô nghĩa)
  let badge: string | null = null;
  if (type === "student") {
    const active = await prisma.student.count({ where: { ...orgWhere(scope), isStudying: true } });
    badge = t("badge_studying", { count: active });
  } else if (type === "teacher") {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const added = await prisma.teacher.count({
      where: { ...orgWhere(scope), createdAt: { gte: monthStart } },
    });
    badge = t("badge_new", { count: added });
  }
  const typeLabel = { admin: t("admins"), teacher: t("teachers"), student: t("students"), parent: t("parents") }[type];

  return (
    <div className="rounded-2xl odd:bg-lucasPurple even:bg-lucasYellow p-4 flex-1 min-w-[130px]">
      <div className="flex justify-between items-center">
        {badge ? (
          <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
            {badge}
          </span>
        ) : (
          <span />
        )}
        <Image src="/more.png" alt="" width={20} height={20} />
      </div>
      <h1 className="text-2xl font-semibold my-4">{data}</h1>
      <h2 className="text-sm font-medium text-gray-500">{typeLabel}</h2>
    </div>
  );
};

export default UserCard;
