import {
  UserSex,
  LessonType,
  PaidStatus,
  Day,
  ClassStatus,
  ClassType,
} from "@prisma/client";
import { z } from "zod";

// Enums converted properly
const UserSexEnum = z.enum([UserSex.MALE, UserSex.FEMALE]);
const LessonTypeEnum = z.enum([LessonType.CENTER, LessonType.HOME]);
const PaidStatusEnum = z.enum([PaidStatus.PAID, PaidStatus.UNPAID]);
const ClassStatusEnum = z.enum([
  ClassStatus.CANCELED,
  ClassStatus.UPCOMING,
  ClassStatus.TAUGHT,
]);
const ClassTypeEnum = z.enum([ClassType.CENTER, ClassType.PRIVATE]);

const DayEnum = z.enum([
  Day.MONDAY,
  Day.TUESDAY,
  Day.WEDNESDAY,
  Day.THURSDAY,
  Day.FRIDAY,
  Day.SATURDAY,
  Day.SUNDAY,
]);

// Class schema
export const classSchema = z.object({
  id: z.coerce.string().uuid().optional(),
  className: z.string().min(1, { message: "Class name is required!" }),
  type: ClassTypeEnum,
  teacherId: z.string().optional(), // GV phụ trách
  date: DayEnum,
  endDate: z.string().optional().or(z.literal("")), // yyyy-mm-dd; rỗng/null = đang học (mở)
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Invalid time format!" }), // Validate time format
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Invalid time format!" }), // Validate time format
  students: z.array(z.any()).optional(),
  teachingRecords: z.array(z.any()).optional(),
  // Lớp nhóm theo sĩ số (D2): nếu isGroup → không roster, lưu base + rate/HS.
  isGroup: z.coerce.boolean().optional(),
  groupBasePerSession: z.coerce.number().optional(),
  groupRatePerStudent: z.coerce.number().optional(),
  // Màu lịch — chỉ áp dụng cho lớp PRIVATE (1 trong 5 màu cố định, xem lib/classColors.ts).
  color: z.string().optional(),
});
export type ClassSchema = z.infer<typeof classSchema>;

// Student schema
export const studentSchema = z.object({
  id: z.string().optional(),
  studentName: z.string().min(1, { message: "Student name is required!" }),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().min(1, { message: "Address is required!" }),
  sex: UserSexEnum,
  isStudying: z.boolean().default(false),
  tuition: z.coerce.number({ message: "Tuition is required!" }),
  lessonType: LessonTypeEnum,
  parentId: z.string().optional(), // ideally define a parent schema
  ownerTeacherId: z.string().optional(), // GV phụ trách chính (admin chọn; teacher tự gán)
  classes: z.array(z.any()).optional(), // ideally define a class schema
  assignments: z.array(z.any()).optional(), // ideally define an assignment schema
  monthlyTuition: z.array(z.any()).optional(), // ideally define a tuition schema
});
export type StudentSchema = z.infer<typeof studentSchema>;

// Teacher schema
export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
  teacherName: z.string().min(1, { message: "Teacher name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  sex: UserSexEnum,
  subject: z.string().optional(), // bộ môn / nhạc cụ
  // Tham số lương (VND)
  privateRatePerSession: z.coerce.number().default(0),
  centerBasePerSession: z.coerce.number().default(0),
  centerRatePerStudent: z.coerce.number().default(0),
});
export type TeacherSchema = z.infer<typeof teacherSchema>;

export const parentSchema = z.object({
  id: z.string().uuid().optional(),
  parentName: z.string().min(1, { message: "Parent name is required!" }),
  sex: UserSexEnum,
  phone: z.string().optional(),
  students: z.array(z.string()),
});

export type ParentSchema = z.infer<typeof parentSchema>;

export const classSessionSchema = z.object({
  id: z.coerce.string().uuid().optional(),
  classId: z.coerce.string().uuid(),
  status: ClassStatusEnum,
  money: z.coerce.number({ message: "Tuition is required!" }),
  date: z.coerce.date(),
});

export type ClassSessionSchema = z.infer<typeof classSessionSchema>;

export const tuitionSchema = z.object({
  id: z.coerce.string().uuid().optional(),
  studentId: z.coerce.string().uuid(),
  classId: z.coerce.string().uuid(),
  status: ClassStatusEnum,
  month: z.coerce.string().min(1, { message: "Month is required!" }),
  year: z.coerce.string().min(1, { message: "Year is required!" }),
  money: z.coerce.number({ message: "Tuition is required!" }),
  paintStatus: PaidStatusEnum,
});

export type TuitionSchema = z.infer<typeof tuitionSchema>;
