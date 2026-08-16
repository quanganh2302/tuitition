import prisma from "@/lib/prisma";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";
import { PaidStatus, Prisma } from "@prisma/client";

const Announcements = async ({
  ownerTeacherId,
  studentId,
}: {
  ownerTeacherId?: string; // trang chi tiết GV: lọc học phí HS của GV này
  studentId?: string; // trang chi tiết HS: lọc học phí của HS này
} = {}) => {
  const actor = getScope();
  const { userId, role } = actor;
  const t = await getTranslations("Dashboard");

  // Ưu tiên prop (đang xem chi tiết 1 GV/HS). Nếu không, scope theo vai trò người đăng nhập:
  // teacher → HS của mình; parent → của mình; admin → tất cả; vai trò lạ → không gì.
  const scope: Prisma.MonthlyTuitionWhereInput = studentId
    ? { studentId }
    : ownerTeacherId
    ? { student: { ownerTeacherId } }
    : role === "admin"
    ? {}
    : role === "teacher"
    ? { student: { ownerTeacherId: userId! } }
    : role === "parent"
    ? { student: { parentId: userId! } }
    : { id: "___none___" };

  const data = await prisma.monthlyTuition.findMany({
    take: 3,
    where: {
      paidStatus: PaidStatus.UNPAID,
      ...orgWhere(actor), // tenant: chỉ học phí trong trung tâm của actor
      ...scope,
    },
    include: {
      student: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="bg-white p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("collect_tuition")}</h1>
        <span className="text-xs text-gray-400 cursor-pointer hover:underline">
          {t("view_all")}
        </span>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        {data.map((item, index) => {
          const bgColors = ["bg-lucasSky", "bg-lucasPurple", "bg-lucasYellow"];
          const bgColor = bgColors[index % bgColors.length];

          return (
            <div key={item.id} className={`${bgColor} rounded-md p-4`}>
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{item.student.studentName}</h2>
                <span className="text-xs text-gray-400 bg-white rounded-md px-2 py-1">
                  {`${item.month}/${item.year}`}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {t("tuition_note", {
                  name: item.student.studentName,
                  month: item.month,
                  year: item.year,
                  amount: item.totalAmount,
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Announcements;
