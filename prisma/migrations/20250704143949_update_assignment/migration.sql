/*
  Warnings:

  - You are about to drop the column `studentId` on the `Lesson` table. All the data in the column will be lost.
  - Added the required column `lessonId` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_studentId_fkey";

-- DropIndex
DROP INDEX "Lesson_studentId_key";

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "studentId";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "lessonId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
