/*
  Warnings:

  - You are about to drop the column `tuition` on the `ClassSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "tuition" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ClassSession" DROP COLUMN "tuition";
