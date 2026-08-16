/*
  Warnings:

  - A unique constraint covering the columns `[lessonId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Student_lessonId_key" ON "Student"("lessonId");
