import prisma from "@/lib/prisma";
import { getScope, orgWhere } from "@/lib/scope";
import { isSoloAdmin } from "@/lib/solo";
import { computeTeacherSalary, computeSoloIncome } from "@/lib/finance";
import { getTranslations } from "next-intl/server";
import Table from "@/components/Table";

const pad = (n: number) => String(n).padStart(2, "0");

const SalaryPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const scope = getScope();
  const { userId, role } = scope;
  const ts = await getTranslations("Salary");

  const now = new Date();
  const monthStr = searchParams.month || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [year, month] = monthStr.split("-").map(Number);

  // Scoping: admin/super-admin xem lương GV trong phạm vi (org / tất cả); teacher chỉ xem của mình.
  const teachers =
    role === "admin" || role === "superadmin"
      ? await prisma.teacher.findMany({
          where: { ...orgWhere(scope) },
          select: { id: true, teacherName: true },
        })
      : role === "teacher"
      ? await prisma.teacher.findMany({
          where: { id: userId!, ...orgWhere(scope) },
          select: { id: true, teacherName: true },
        })
      : [];

  // Solo: "lương" = thu nhập từ học phí HS (mỗi HS 1 giá). Center: lương theo rate + Class.type.
  const solo = await isSoloAdmin(userId);
  const rows = await Promise.all(
    teachers.map(async (t) => {
      if (solo) {
        const inc = await computeSoloIncome(t.id, year, month, scope.orgId ?? undefined);
        return {
          id: t.id,
          teacherName: t.teacherName,
          sessions: inc.sessions,
          substitutes: 0,
          total: inc.total,
        };
      }
      const s = await computeTeacherSalary(t.id, year, month, scope.orgId ?? undefined);
      return {
        id: t.id,
        teacherName: t.teacherName,
        sessions: s.lines.length,
        substitutes: s.lines.filter((l) => l.isSubstitute).length,
        total: s.total,
      };
    })
  );

  const columns = [
    { header: ts("col_teacher"), accessor: "teacherName" },
    { header: ts("col_sessions"), accessor: "sessions", className: "hidden md:table-cell" },
    { header: ts("col_substitutes"), accessor: "substitutes", className: "hidden md:table-cell" },
    { header: ts("col_total"), accessor: "total" },
  ];

  const renderRow = (item: (typeof rows)[number]) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lucasPurpleLight"
    >
      <td className="p-4 font-semibold">{item.teacherName}</td>
      <td className="hidden md:table-cell">{item.sessions}</td>
      <td className="hidden md:table-cell">{item.substitutes}</td>
      <td className="font-medium">
        {item.total.toLocaleString("vi-VN")}₫
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="hidden md:block text-lg font-semibold">{ts("title")}</h1>
        <form className="flex items-center gap-2">
          <input
            type="month"
            name="month"
            defaultValue={monthStr}
            className="ring-[1.5px] ring-gray-300 p-1.5 rounded-md text-sm"
          />
          <button className="px-3 py-1.5 rounded-md bg-lucasYellow text-sm font-medium">
            {ts("view")}
          </button>
        </form>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={rows} />
    </div>
  );
};

export default SalaryPage;
