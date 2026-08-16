/*
  Warnings:

  - You are about to drop the column `amount` on the `MonthlyTuition` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,classId,year,month]` on the table `MonthlyTuition` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `classId` to the `MonthlyTuition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `MonthlyTuition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MonthlyTuition" DROP COLUMN "amount",
ADD COLUMN     "classId" TEXT NOT NULL,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "paidStatus" SET DEFAULT 'UNPAID';

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyTuition_studentId_classId_year_month_key" ON "MonthlyTuition"("studentId", "classId", "year", "month");

-- AddForeignKey
ALTER TABLE "MonthlyTuition" ADD CONSTRAINT "MonthlyTuition_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
