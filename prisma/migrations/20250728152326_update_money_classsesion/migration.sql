/*
  Warnings:

  - You are about to drop the column `tuition` on the `Class` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Class" DROP COLUMN "tuition";

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "tuition" INTEGER NOT NULL DEFAULT 0;
