/*
  Warnings:

  - A unique constraint covering the columns `[classId,date]` on the table `ClassSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_classId_date_key" ON "ClassSession"("classId", "date");
