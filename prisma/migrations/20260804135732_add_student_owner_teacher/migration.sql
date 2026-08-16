-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "ownerTeacherId" TEXT;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_ownerTeacherId_fkey" FOREIGN KEY ("ownerTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
