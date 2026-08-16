-- CreateEnum
CREATE TYPE "ClassType" AS ENUM ('CENTER', 'PRIVATE');

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "teacherId" TEXT,
ADD COLUMN     "type" "ClassType" NOT NULL DEFAULT 'CENTER';

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "sex" "UserSex" NOT NULL,
    "subject" TEXT,
    "privateRatePerSession" INTEGER NOT NULL DEFAULT 0,
    "centerBasePerSession" INTEGER NOT NULL DEFAULT 0,
    "centerRatePerStudent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_username_key" ON "Teacher"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_phone_key" ON "Teacher"("phone");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
