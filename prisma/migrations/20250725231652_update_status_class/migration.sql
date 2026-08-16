/*
  Warnings:

  - You are about to drop the column `isTaught` on the `ClassSession` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('CANCELED', 'UPCOMING', 'TAUGHT');

-- AlterTable
ALTER TABLE "ClassSession" DROP COLUMN "isTaught",
ADD COLUMN     "status" "ClassStatus" NOT NULL DEFAULT 'UPCOMING';
