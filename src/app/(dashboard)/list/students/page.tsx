import FormContainer from "@/components/FormContainer";
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
import { Class, Prisma, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

type StudentList = Student & { classes: Class[] };

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const scope = getScope();
  const { userId, role } = scope;
  const canManage = role === "admin" || role === "teacher";
  const t = await getTranslations("Students");
  const tc = await getTranslations("Common");
  const td = await getTranslations("Days");

  const columns = [
    { header: t("col_info"), accessor: "info" },
    { header: t("col_schedule"), accessor: "days", className: "hidden md:table-cell" },
    { header: t("col_tuition"), accessor: "tuition", className: "hidden md:table-cell" },
    { header: tc("phone"), accessor: "phone", className: "hidden lg:table-cell" },
    { header: tc("address"), accessor: "address", className: "hidden lg:table-cell" },
    ...(canManage
      ? [{ header: tc("actions"), accessor: "actions", className: "hidden lg:table-cell" }]
      : []),
  ];
  const renderRow = (item: StudentList) => (
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
          <h3 className="font-semibold flex items-center gap-2">
            {item.studentName}
            {!item.isStudying && (
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                {t("stopped")}
              </span>
            )}
          </h3>
        </div>
      </td>
      <td className="hidden md:table-cell">
        {item.classes.length > 0
          ? item.classes.map((cls) => td(cls.date)).join(", ")
          : t("no_schedule")}
      </td>
      <td className="hidden md:table-cell">
        {item.tuition ? Number(item.tuition).toLocaleString("vi-VN") : "0"} VND
      </td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          <Link href={`/list/students/${item.id}`}>
            <button className="w-7 h-7 flex items-center justify-center rounded-full bg-lucasSky">
              <Image src="/view.png" alt="" width={16} height={16} />
            </button>
          </Link>
          {canManage && (
            <>
              <FormContainer table="student" type="update" data={item} />
              <FormContainer
                table="student"
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
  console.log("Page number:", page);
  const query: Prisma.StudentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      switch (key) {
        // case "lessonId":
        //   if (typeof value === "string") {
        //     const lessonId = parseInt(value);
        //     if (!isNaN(lessonId)) {
        //       query.lessonId = lessonId;
        //     }
        //   }
        //   break;
        case "search":
          query.searchName = { contains: normalizeVN(value || "") };
        default:
          break;
      }
    }
  }

  // Tenant scoping: chỉ HS trong trung tâm của actor (super-admin không lọc).
  Object.assign(query, orgWhere(scope));
  // Data scoping: giáo viên chỉ thấy học viên mình phụ trách (ownerTeacherId)
  if (role === "teacher") {
    query.ownerTeacherId = userId!;
  }

  // Filter: trạng thái học (đang học / đã nghỉ)
  if (queryParams.study === "1") query.isStudying = true;
  else if (queryParams.study === "0") query.isStudying = false;

  const sort: "asc" | "desc" = queryParams.sort === "asc" ? "asc" : "desc";

  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      orderBy: { createdAt: sort },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      include: {
        classes: true,
      },
    }),
    prisma.student.count({ where: query }),
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
              param="study"
              options={[
                { label: tc("all"), value: "" },
                { label: t("studying"), value: "1" },
                { label: t("stopped"), value: "0" },
              ]}
            />
            <SortButton />
            {canManage && <FormContainer table="student" type="create" />}
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

export default StudentListPage;
