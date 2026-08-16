-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_studentId_fkey";

-- AlterTable
ALTER TABLE "Class" ALTER COLUMN "studentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
