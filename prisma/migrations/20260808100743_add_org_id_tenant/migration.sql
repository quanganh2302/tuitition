-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "MonthlyTuition" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "orgId" TEXT;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "orgId" TEXT;

-- CreateIndex
CREATE INDEX "Class_orgId_idx" ON "Class"("orgId");

-- CreateIndex
CREATE INDEX "ClassSession_orgId_idx" ON "ClassSession"("orgId");

-- CreateIndex
CREATE INDEX "MonthlyTuition_orgId_idx" ON "MonthlyTuition"("orgId");

-- CreateIndex
CREATE INDEX "Parent_orgId_idx" ON "Parent"("orgId");

-- CreateIndex
CREATE INDEX "Student_orgId_idx" ON "Student"("orgId");

-- CreateIndex
CREATE INDEX "Teacher_orgId_idx" ON "Teacher"("orgId");
