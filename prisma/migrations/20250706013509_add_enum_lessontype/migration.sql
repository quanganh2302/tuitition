/*
  Warnings:

  - You are about to drop the column `day` on the `Lesson` table. All the data in the column will be lost.
  - Added the required column `lessonType` to the `Lesson` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('CENTER', 'HOME');

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_lessonId_fkey";

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "day",
ADD COLUMN     "days" "Day"[],
ADD COLUMN     "lessonType" "LessonType" NOT NULL;

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "lessonId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
