import prisma from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import Table from "@/components/Table";
import OrgSuspendToggle from "@/components/OrgSuspendToggle";
import OrgTeacherLimitControl from "@/components/OrgTeacherLimitControl";
import { clerkClient } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

// Panel super-admin: liệt kê mọi trung tâm/solo + số liệu tổng (GV/HS/doanh thu).
// Chỉ ở mức tài khoản — KHÔNG lội vào dữ liệu chi tiết từng trung tâm. Xem docs/DESIGN-multi-tenant.md.
const PlatformPage = async () => {
  const scope = getScope();
  if (!scope.isSuperAdmin) redirect("/"); // defense-in-depth (middleware đã chặn)
  const t = await getTranslations("Platform");

  // Danh sách org từ Clerk.
  const { data: orgs } = await clerkClient.organizations.getOrganizationList({
    limit: 100,
  });

  // Số liệu DB gom theo orgId. ponytail: quét toàn bảng rồi tally trong JS — đủ ở quy mô
  // super-admin (ít org/ít row); nếu dữ liệu lớn thì đổi sang groupBy/SQL.
  const [teachers, students, tuitions] = await prisma.$transaction([
    prisma.teacher.findMany({ select: { orgId: true } }),
    prisma.student.findMany({ select: { orgId: true } }),
    prisma.monthlyTuition.findMany({ select: { orgId: true, totalAmount: true } }),
  ]);
  const tally = (r: { orgId: string | null }[]) => {
    const m = new Map<string, number>();
    for (const x of r) if (x.orgId) m.set(x.orgId, (m.get(x.orgId) ?? 0) + 1);
    return m;
  };
  const teacherCount = tally(teachers);
  const studentCount = tally(students);
  const revenue = new Map<string, number>();
  for (const t of tuitions)
    if (t.orgId) revenue.set(t.orgId, (revenue.get(t.orgId) ?? 0) + t.totalAmount);

  const rows = orgs.map((o) => {
    const meta = (o.publicMetadata ?? {}) as {
      orgType?: string;
      suspended?: boolean;
      teacherLimit?: number;
      upgradeRequested?: boolean;
    };
    return {
      id: o.id,
      name: o.name,
      orgType: meta.orgType === "solo" ? t("type_solo") : t("type_center"),
      teachers: teacherCount.get(o.id) ?? 0,
      students: studentCount.get(o.id) ?? 0,
      revenue: revenue.get(o.id) ?? 0,
      createdAt: new Date(o.createdAt).toLocaleDateString("vi-VN"),
      suspended: meta.suspended === true,
      teacherLimit:
        typeof meta.teacherLimit === "number" && meta.teacherLimit > 0 ? meta.teacherLimit : 3,
      upgradeRequested: meta.upgradeRequested === true,
    };
  });

  const columns = [
    { header: t("col_center"), accessor: "name" },
    { header: t("col_type"), accessor: "orgType", className: "hidden md:table-cell" },
    { header: t("col_teachers"), accessor: "teachers" },
    { header: t("col_limit"), accessor: "limit" },
    { header: t("col_students"), accessor: "students" },
    { header: t("col_revenue"), accessor: "revenue", className: "hidden md:table-cell" },
    { header: t("col_created"), accessor: "createdAt", className: "hidden lg:table-cell" },
    { header: t("col_status"), accessor: "status" },
  ];

  const renderRow = (item: (typeof rows)[number]) => (
    <tr key={item.id} className="border-b border-gray-200 even:bg-slate-50 text-sm">
      <td className="p-4 font-semibold">{item.name}</td>
      <td className="hidden md:table-cell">{item.orgType}</td>
      <td>{item.teachers}</td>
      <td>
        <div className="flex items-center gap-2">
          <span className={item.upgradeRequested ? "text-amber-700 font-medium" : ""}>
            {item.teachers}/{item.teacherLimit}
          </span>
          <OrgTeacherLimitControl
            orgId={item.id}
            limit={item.teacherLimit}
            requested={item.upgradeRequested}
          />
        </div>
      </td>
      <td>{item.students}</td>
      <td className="hidden md:table-cell">{item.revenue.toLocaleString("vi-VN")}₫</td>
      <td className="hidden lg:table-cell">{item.createdAt}</td>
      <td>
        <div className="flex items-center gap-2">
          {item.suspended && (
            <span className="text-xs text-red-500 font-medium">{t("suspended")}</span>
          )}
          <OrgSuspendToggle orgId={item.id} suspended={item.suspended} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-semibold">{t("all_centers", { count: rows.length })}</h1>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">{t("empty")}</p>
      ) : (
        <Table columns={columns} renderRow={renderRow} data={rows} />
      )}
    </div>
  );
};

export default PlatformPage;
