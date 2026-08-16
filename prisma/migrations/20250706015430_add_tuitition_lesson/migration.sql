/*
  Warnings:

  - You are about to drop the column `tuition` on the `Student` table. All the data in the column will be lost.
  - Added the required column `tuition` to the `Lesson` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "tuition" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "tuition";
