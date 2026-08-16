// import { Day, PrismaClient, Role, UserSex, LessonType } from "@prisma/client";
// const prisma = new PrismaClient();

// async function main() {
//   // PARENT
//   for (let i = 1; i <= 25; i++) {
//     await prisma.parent.create({
//       data: {
//         id: `parentId${i}`,
//         parentName: `Parent ${i}`,
//         sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
//         phone: `123-456-78${i}`,
//       },
//     });
//   }
//   // STUDENT
//   for (let i = 1; i <= 50; i++) {
//     await prisma.student.create({
//       data: {
//         id: `student${i}`,
//         username: `student${i}`,
//         studentName: `student${i}`,
//         address: `Address${i}`,
//         isStudying: true,
//         sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
//         parentId: `parentId${Math.ceil(i / 2) % 25 || 25}`,
//         tuition: parseFloat((i * 10 + 100000).toFixed(2)),
//         lessonType: i % 2 === 0 ? LessonType.CENTER : LessonType.HOME,
//       },
//     });
//   }

//   // Class Schedule
//   // Get current week range
//   const now = new Date();
//   const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
//   const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

//   const monday = new Date(now);
//   monday.setDate(now.getDate() + offsetToMonday);
//   monday.setHours(0, 0, 0, 0);

//   const dayValues = Object.values(Day); // ['MONDAY', ..., 'SUNDAY']

//   for (let i = 1; i <= 10; i++) {
//     const randomDayOffset = Math.floor(Math.random() * 7);
//     const classDate = new Date(monday);
//     classDate.setDate(monday.getDate() + randomDayOffset);
//     classDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

//     const endDate = new Date(classDate);
//     endDate.setHours(classDate.getHours() + 2);

//     await prisma.class.create({
//       data: {
//         className: `Class ${i}`,
//         date: dayValues[classDate.getDay()], // ✅ Now safe
//         startTime: classDate,
//         endTime: endDate,
//         studentId: `student${(i % 50) + 1}`,
//       },
//     });
//   }

//   // ASSIGNMENT
//   for (let i = 1; i <= 10; i++) {
//     await prisma.assignment.create({
//       data: {
//         title: `Assignment ${i}`,
//         startDate: new Date(new Date().setHours(new Date().getHours() + 1)),
//         dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
//         studentId: `student${(i % 50) + 1}`,
//       },
//     });
//   }
//   const classes = await prisma.class.findMany(); // fetch all classes

//   for (const cls of classes) {
//     await prisma.teachingRecord.create({
//       data: {
//         classId: cls.id,
//         isTaught: Math.random() < 0.7, // 70% chance the class was taught
//         createdAt: new Date(),
//       },
//     });
//   }

//   // Seed MonthlyTuition for last 3 months
//   const monthsBack = [0, 1, 2]; // 0 = current month, 1 = last month, etc.
//   const students = await prisma.student.findMany();

//   for (const monthOffset of monthsBack) {
//     const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
//     const year = date.getFullYear();
//     const month = date.getMonth() + 1;
//     const start = new Date(year, date.getMonth(), 1);
//     const end = new Date(year, date.getMonth() + 1, 0, 23, 59, 59, 999);

//     const records = await prisma.teachingRecord.findMany({
//       where: {
//         isTaught: true,
//         class: {
//           startTime: {
//             gte: start,
//             lte: end,
//           },
//         },
//       },
//       include: {
//         class: {
//           select: {
//             studentId: true,
//             student: {
//               select: {
//                 tuition: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     const tuitionPerStudent: Record<string, number> = {};

//     for (const record of records) {
//       const studentId = record.class.studentId;
//       const tuition = Number(record.class.student.tuition);
//       if (!tuitionPerStudent[studentId]) {
//         tuitionPerStudent[studentId] = 0;
//       }
//       tuitionPerStudent[studentId] += tuition;
//     }

//     for (const student of students) {
//       const amount = tuitionPerStudent[student.id] || 0;
//       const paidStatus = Math.random() < 0.5 ? "PAID" : "UNPAID";

//       await prisma.monthlyTuition.create({
//         data: {
//           studentId: student.id,
//           year,
//           month,
//           amount,
//           paidStatus,
//         },
//       });
//     }
//   }

//   // SHEET MUSIC
//   for (let i = 1; i <= 10; i++) {
//     await prisma.sheetMusic.create({
//       data: {
//         title: `Sheet Title ${i}`,
//         composer: `Composer ${i}`,
//         description: `Description for sheet music ${i}`,
//         difficulty: "MEDIUM",
//         image: `sheet${i}.png`,
//       },
//     });
//   }

//   console.log("✅ Seeding completed successfully.");
// }

// main()
//   .then(() => prisma.$disconnect())
//   .catch(async (e) => {
//     console.error("❌ Seeding failed:", e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
