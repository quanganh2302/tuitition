import CloseTuitionButton from "@/components/CloseTuitionButton";
import TuitionPaidToggle from "@/components/TuitionPaidToggle";
import TuitionAmountEdit from "@/components/TuitionAmountEdit";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import SortButton from "@/components/SortButton";
import FilterMenu from "@/components/FilterMenu";
import MonthFilter from "@/components/MonthFilter";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { normalizeVN } from "@/lib/utils";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";
import { MonthlyTuition, Prisma, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

type Announcement = MonthlyTuition & { student: Student };

const AnnouncementListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const scope = getScope();
  const { userId, role } = scope;
  const canManage = role === "admin" || role === "teacher";
  const t = await getTranslations("Tuition");
  const tc = await getTranslations("Common");

  const columns = [
    { header: t("col_student"), accessor: "studentName" },
    { header: t("col_month"), accessor: "month" },
    { header: t("col_amount"), accessor: "totalAmount" },
    { header: t("col_status"), accessor: "paidStatus" },
    { header: tc("actions"), accessor: "actions", className: "hidden lg:table-cell" },
  ];
  const renderRow = (item: Announcement) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lucasPurpleLight"
    >
      <td className="p-4 font-semibold">
        {item.student?.studentName ?? "—"}
      </td>
      <td>
        {item.month}/{item.year}
      </td>
      <td>{item.totalAmount.toLocaleString("vi-VN")}₫</td>
      <td>
        {canManage ? (
          <TuitionPaidToggle id={item.id} paid={item.paidStatus === "PAID"} />
        ) : item.paidStatus === "PAID" ? (
          tc("paid")
        ) : (
          tc("unpaid")
        )}
      </td>
      <td className="hidden lg:table-cell">
        <div className="flex items-center gap-2">
          <Link
            href={`/list/students/${item.studentId}?month=${item.year}-${String(item.month).padStart(2, "0")}`}
            title={t("view_sessions")}
          >
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lucasSky">
              <Image src="/view.png" alt={tc("view")} width={16} height={16} />
            </button>
          </Link>
          {canManage && <TuitionAmountEdit id={item.id} amount={item.totalAmount} />}
        </div>
      </td>
    </tr>
  );
  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;
  const query: Prisma.MonthlyTuitionWhereInput = {};

  // Tenant scoping: chỉ học phí trong trung tâm của actor (MonthlyTuition có orgId).
  Object.assign(query, orgWhere(scope));

  // Search theo TÊN HỌC SINH (+ giữ scope GV)
  const studentFilter: Prisma.StudentWhereInput = {};
  if (role === "teacher") studentFilter.ownerTeacherId = userId!;
  if (queryParams.search) {
    studentFilter.searchName = { contains: normalizeVN(queryParams.search) };
  }
  if (Object.keys(studentFilter).length) {
    query.student = studentFilter;
  }

  // Filter: trạng thái đóng
  if (queryParams.paid === "PAID") query.paidStatus = "PAID";
  else if (queryParams.paid === "UNPAID") query.paidStatus = "UNPAID";

  // Filter: theo tháng (?month=YYYY-MM). Không chọn → toàn bộ.
  if (/^\d{4}-\d{2}$/.test(queryParams.month ?? "")) {
    const [y, m] = queryParams.month!.split("-").map(Number);
    query.year = y;
    query.month = m;
  }

  const sort: "asc" | "desc" = queryParams.sort === "asc" ? "asc" : "desc";

  const [data, count] = await prisma.$transaction([
    prisma.monthlyTuition.findMany({
      where: query,
      orderBy: [{ year: sort }, { month: sort }],
      include: { student: true, class: true },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.monthlyTuition.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex flex-col min-h-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className=" hidden md:block text-lg font-semibold">{t("title")}</h1>
        <div className="flex flex-col md:flex-row items-center gap-4  w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <FilterMenu
              param="paid"
              options={[
                { label: tc("all"), value: "" },
                { label: tc("paid"), value: "PAID" },
                { label: tc("unpaid"), value: "UNPAID" },
              ]}
            />
            <SortButton />
            <MonthFilter />
            {canManage && <CloseTuitionButton />}
          </div>
        </div>
      </div>
      {/* LIST — vùng cuộn riêng, không kéo cuộn cả trang */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Table columns={columns} renderRow={renderRow} data={data} />
      </div>
      {/* PAGINATION */}
      <Pagination page={p} count={count}/>
    </div>
  );
};

export default AnnouncementListPage;
