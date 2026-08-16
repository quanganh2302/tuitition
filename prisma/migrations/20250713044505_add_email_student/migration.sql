/*
  Warnings:

  - You are about to alter the column `tuition` on the `Student` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Integer`.
  - A unique constraint covering the columns `[email]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "email" TEXT,
ALTER COLUMN "tuition" SET DATA TYPE INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
