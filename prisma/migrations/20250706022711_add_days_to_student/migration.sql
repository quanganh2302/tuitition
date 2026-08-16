/*
  Warnings:

  - You are about to drop the column `lessonId` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `lessonId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the `Lesson` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `studentId` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endTime` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lessonType` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tuition` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_lessonId_fkey";

-- DropIndex
DROP INDEX "Student_lessonId_key";

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "lessonId",
ADD COLUMN     "studentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "lessonId",
ADD COLUMN     "days" "Day"[],
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lessonType" "LessonType" NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "tuition" DECIMAL(65,30) NOT NULL;

-- DropTable
DROP TABLE "Lesson";

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
