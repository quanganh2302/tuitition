import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import SortButton from "@/components/SortButton";
import MonthFilter from "@/components/MonthFilter";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { ensureDueSessions } from "@/lib/actions";
import { toVietnamMidnightUTC, normalizeVN } from "@/lib/utils";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";
import { Class, ClassSession, Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

type LessonList = ClassSession & { class: Class };

const LessonListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const scope = getScope();
  const { userId, role } = scope;
  const canManage = role === "admin" || role === "teacher";
  const t = await getTranslations("Lessons");
  const tc = await getTranslations("Common");

  const columns = [
    { header: t("col_class"), accessor: "className" },
    { header: t("col_date"), accessor: "day" },
    { header: t("col_tuition"), accessor: "tuition" },
    { header: t("col_status"), accessor: "status" },
    ...(canManage
      ? [{ header: tc("actions"), accessor: "actions", className: "hidden lg:table-cell" }]
      : []),
  ];
  const renderRow = (item: LessonList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lucasPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <h3 className="font-semibold ">
          {" "}
          {item.class?.className ?? "Unknown Class"}
        </h3>
      </td>
      <td className="hidden md:table-cell">
        {item.date
          ? item.date.toLocaleDateString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })
          : ""}
      </td>
      <td className="hidden md:table-cell">{item.tuition}</td>

      <td className="hidden md:table-cell">
        {item?.status === "TAUGHT"
          ? t("status_taught")
          : item?.status === "UPCOMING"
          ? t("status_upcoming")
          : t("status_canceled")}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <FormContainer table="lesson" type="update" data={item} />
              <FormContainer
                table="lesson"
                type="delete"
                id={item.id.toString()}
              />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;
  const query: Prisma.ClassSessionWhereInput = {};

  // Tenant scoping: chỉ buổi trong trung tâm của actor (ClassSession có orgId).
  Object.assign(query, orgWhere(scope));
  // Scope lớp (tenant + GV) — dùng cho ensureDueSessions + search theo tên lớp.
  const classScope: Prisma.ClassWhereInput = {
    ...orgWhere(scope),
    ...(role === "teacher" ? { teacherId: userId! } : {}),
  };

  // Search theo TÊN LỚP (+ giữ scope GV/tenant)
  const classFilter: Prisma.ClassWhereInput = { ...classScope };
  if (queryParams.search) {
    classFilter.searchName = { contains: normalizeVN(queryParams.search) };
  }
  if (Object.keys(classFilter).length) {
    query.class = classFilter;
  }

  // Vật chất hoá buổi đã tới hạn (mô hình B); chỉ hiện buổi THẬT tới hôm nay (lịch sử + tới hạn).
  await ensureDueSessions(classScope);
  const now = new Date();
  const todayEnc = toVietnamMidnightUTC(
    new Date(now.getFullYear(), now.getMonth(), now.getDate())
  );

  // Filter: theo tháng (?month=YYYY-MM). Không chọn → toàn bộ lịch sử tới hôm nay.
  if (/^\d{4}-\d{2}$/.test(queryParams.month ?? "")) {
    const [y, m] = queryParams.month!.split("-").map(Number);
    query.date = {
      gte: toVietnamMidnightUTC(new Date(y, m - 1, 1)),
      lt: toVietnamMidnightUTC(new Date(y, m, 1)),
    };
  } else {
    query.date = { lte: todayEnc };
  }
  const sort: "asc" | "desc" = queryParams.sort === "asc" ? "asc" : "desc";

  const [data, count] = await prisma.$transaction([
    prisma.classSession.findMany({
      where: query,
      orderBy: { date: sort },
      include: { class: true },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.classSession.count({ where: query }),
  ]);
  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex flex-col min-h-0 [&_table]:has-[[aria-busy=true]]:opacity-50">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className=" hidden md:block text-lg font-semibold">{t("title")}</h1>
        <div className="flex flex-col md:flex-row items-center gap-4  w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <MonthFilter />
            <SortButton />
            {/* Buổi học tự sinh khi tạo lớp — không tạo thủ công ở đây */}
          </div>
        </div>
      </div>
      {/* LIST */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Table columns={columns} renderRow={renderRow} data={data} />
      </div>
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default LessonListPage;
