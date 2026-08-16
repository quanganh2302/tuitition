-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "searchName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "searchName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "searchName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "searchName" TEXT NOT NULL DEFAULT '';
