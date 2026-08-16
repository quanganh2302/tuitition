import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { getScope, orgWhere } from "@/lib/scope";

export type FormContainerProps = {
  table: "teacher" | "student" | "parent" | "class" | "lesson";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
  plain?: boolean; // bỏ nền tròn màu — dùng khi đặt trên ảnh nền (vd thẻ thông tin chi tiết)
};

const FormContainer = async ({ table, type, data, id, plain }: FormContainerProps) => {
  let relatedData = {};

  const scope = getScope();
  const { userId, role } = scope;
  const org = orgWhere(scope); // lọc dropdown theo trung tâm của actor

  if (type !== "delete") {
    switch (table) {
      case "class":
        const classStudent = await prisma.student.findMany({
          where: { ...org, ...(role === "teacher" ? { ownerTeacherId: userId! } : {}) },
          select: { id: true, tuition: true, studentName: true },
        });
        // Chỉ admin mới chọn giáo viên phụ trách; teacher tạo lớp là tự gán mình
        const classTeacher =
          role === "admin"
            ? await prisma.teacher.findMany({
                where: { ...org },
                select: { id: true, teacherName: true },
              })
            : undefined;
        relatedData = {
          tuitions: classStudent,
          students: classStudent,
          teachers: classTeacher,
        };
        break;
      case "teacher":
        relatedData = {}; // form giáo viên không cần dropdown liên kết
        break;
      case "student":
        const studentClass = await prisma.class.findMany({
          where: { ...org, ...(role === "teacher" ? { teacherId: userId! } : {}) },
          select: { id: true, className: true },
        });
        // Chỉ admin mới chọn GV phụ trách; teacher tạo HS là tự gán mình
        const studentTeachers =
          role === "admin"
            ? await prisma.teacher.findMany({
                where: { ...org },
                select: { id: true, teacherName: true },
              })
            : undefined;
        relatedData = {
          classes: studentClass,
          teachers: studentTeachers,
        };
        break;
      case "parent":
        const parentStudent = await prisma.student.findMany({
          where: { ...org },
          select: { id: true, studentName: true },
        });
        relatedData = { students: parentStudent };
        break;
      case "lesson":
        const lessonClass = await prisma.class.findMany({
          where: { ...org },
          select: { id: true, className: true , date: true },
        });
          const lessonStudent = await prisma.student.findMany({
          where: { ...org },
          select: { id: true, studentName: true , tuition: true },
        });
        relatedData = { classes: lessonClass, students: lessonStudent };
        break;

      default:
        break;
    }
  }

  return (
    <div className="">
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
        plain={plain}
      />
    </div>
  );
};

export default FormContainer;
