import FormContainer from "@/components/FormContainer";
import GroupSessionForm from "@/components/GroupSessionForm";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import SortButton from "@/components/SortButton";
import FilterMenu from "@/components/FilterMenu";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { normalizeVN } from "@/lib/utils";
import { getScope, orgWhere } from "@/lib/scope";
import { getTranslations } from "next-intl/server";
import { Class, Day, Prisma, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

type ClassList = Class & { student: Student };

const ClassListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const scope = getScope();
  const { userId, role } = scope;
  const canManage = role === "admin" || role === "teacher";
  const t = await getTranslations("Classes");
  const tc = await getTranslations("Common");
  const td = await getTranslations("Days");

  const columns = [
    { header: t("col_name"), accessor: "name" },
    { header: t("col_day"), accessor: "day" },
    { header: t("col_time"), accessor: "startTime" },
    { header: t("col_type"), accessor: "type", className: "hidden md:table-cell" },
    ...(canManage
      ? [{ header: tc("actions"), accessor: "actions", className: "hidden lg:table-cell" }]
      : []),
  ];
  const renderRow = (item: ClassList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lucasPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={"/noAvatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="">
          <h3 className="font-semibold "> {item.className}</h3>
        </div>
      </td>
      <td className="hidden md:table-cell">{td(item.date)}</td>
      <td className="hidden md:table-cell">
        {" "}
        {item.startTime.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        })}
        {" - "}
        {item.endTime.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        })}
      </td>
      <td className="hidden md:table-cell">
        {item.type === "PRIVATE" ? t("type_private") : t("type_center")}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {canManage && item.groupBasePerSession != null && (
            <GroupSessionForm
              classId={item.id}
              className={item.className}
              base={item.groupBasePerSession}
              rate={item.groupRatePerStudent ?? 0}
            />
          )}
          {canManage && (
            <>
              <FormContainer table="class" type="update" data={item} />
              <FormContainer
                table="class"
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
  const query: Prisma.ClassWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      switch (key) {
        case "studentId":
          query.id = value;
          break;
        case "search":
          query.searchName = { contains: normalizeVN(value || "") };
        default:
          break;
      }
    }
  }

  // Tenant scoping: chỉ lớp trong trung tâm của actor (super-admin không lọc).
  Object.assign(query, orgWhere(scope));
  // Data scoping: giáo viên chỉ thấy lớp của mình
  if (role === "teacher") {
    query.teacherId = userId!;
  }

  // Filter: thứ trong tuần (Class không có createdAt → sort theo tên lớp)
  const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  if (DAYS.includes(queryParams.day ?? "")) {
    query.date = queryParams.day as Day;
  }
  const sort: "asc" | "desc" = queryParams.sort === "asc" ? "asc" : "desc";

  const [data, count] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      orderBy: { className: sort },
      include: {
        students: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.class.count({ where: query }),
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
              param="day"
              options={[
                { label: tc("all"), value: "" },
                { label: td("MONDAY"), value: "MONDAY" },
                { label: td("TUESDAY"), value: "TUESDAY" },
                { label: td("WEDNESDAY"), value: "WEDNESDAY" },
                { label: td("THURSDAY"), value: "THURSDAY" },
                { label: td("FRIDAY"), value: "FRIDAY" },
                { label: td("SATURDAY"), value: "SATURDAY" },
                { label: td("SUNDAY"), value: "SUNDAY" },
              ]}
            />
            <SortButton />
            {canManage && <FormContainer table="class" type="create" />}
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

export default ClassListPage;
