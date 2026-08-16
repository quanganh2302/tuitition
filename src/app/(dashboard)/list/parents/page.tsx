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
import { Parent, Prisma, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

type ParentList = Parent & { students: Student[] };

const ParentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const scope = getScope();
  const { userId, role } = scope;
  const canManage = role === "admin" || role === "teacher";
  const t = await getTranslations("Parents");
  const tc = await getTranslations("Common");

  const columns = [
    { header: t("col_info"), accessor: "info" },
    { header: t("col_students"), accessor: "students", className: "hidden md:table-cell" },
    { header: tc("phone"), accessor: "phone", className: "hidden lg:table-cell" },
    ...(canManage
      ? [{ header: tc("actions"), accessor: "actions", className: "hidden lg:table-cell" }]
      : []),
  ];
  const renderRow = (item: ParentList) => (
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
          <h3 className="font-semibold ">{item.parentName}</h3>
        </div>
      </td>
      <td className="hidden md:table-cell">
        {" "}
        {item.students.map((student) => student.studentName).join(",")}
      </td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <FormContainer table="parent" type="update" data={item} />
              <FormContainer
                table="parent"
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
  const query: Prisma.ParentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      switch (key) {
        case "search":
          query.searchName = { contains: normalizeVN(value || "") };
          break;
      }
    }
  }

  // Tenant scoping: chỉ phụ huynh trong trung tâm của actor (super-admin không lọc).
  Object.assign(query, orgWhere(scope));
  // Data scoping: giáo viên chỉ thấy phụ huynh của học sinh mình phụ trách
  if (role === "teacher") {
    query.students = { some: { ownerTeacherId: userId! } };
  }

  // Filter: giới tính (Parent không có createdAt → sort theo tên)
  if (queryParams.sex === "MALE" || queryParams.sex === "FEMALE") {
    query.sex = queryParams.sex;
  }
  const sort: "asc" | "desc" = queryParams.sort === "asc" ? "asc" : "desc";
  function sanitizePrismaData(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(sanitizePrismaData);
    } else if (obj && typeof obj === "object") {
      const newObj: any = {};
      for (const key in obj) {
        const val = obj[key];
        if (val && typeof val.toNumber === "function") {
          newObj[key] = val.toNumber();
        } else {
          newObj[key] = sanitizePrismaData(val);
        }
      }
      return newObj;
    }
    return obj;
  }
  const [rawData, count] = await prisma.$transaction([
    prisma.parent.findMany({
      where: query,
      orderBy: { parentName: sort },
      include: {
        students: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.parent.count({ where: query }),
  ]);
  const data = sanitizePrismaData(rawData);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0 flex flex-col min-h-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className=" hidden md:block text-lg font-semibold">{t("title")}</h1>
        <div className="flex flex-col md:flex-row items-center gap-4  w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <FilterMenu
              param="sex"
              options={[
                { label: tc("all"), value: "" },
                { label: tc("male"), value: "MALE" },
                { label: tc("female"), value: "FEMALE" },
              ]}
            />
            <SortButton />
            {canManage && <FormContainer table="parent" type="create" />}
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

export default ParentListPage;
