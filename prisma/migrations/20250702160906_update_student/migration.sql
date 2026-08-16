/*
  Warnings:

  - You are about to drop the column `studentId` on the `Parent` table. All the data in the column will be lost.
  - Added the required column `address` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Parent_studentId_key";

-- DropIndex
DROP INDEX "Student_tuition_key";

-- AlterTable
ALTER TABLE "Parent" DROP COLUMN "studentId";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "address" TEXT NOT NULL;
