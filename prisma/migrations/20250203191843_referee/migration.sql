/*
  Warnings:

  - Added the required column `relationship` to the `referee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userid` to the `referee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "referee" ADD COLUMN     "relationship" TEXT NOT NULL,
ADD COLUMN     "userid" INTEGER NOT NULL;
