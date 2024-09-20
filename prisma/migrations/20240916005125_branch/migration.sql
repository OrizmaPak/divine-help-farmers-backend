/*
  Warnings:

  - A unique constraint covering the columns `[branch]` on the table `Branch` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Branch" ALTER COLUMN "branch" SET DATA TYPE STRING;

-- CreateIndex
CREATE UNIQUE INDEX "Branch_branch_key" ON "Branch"("branch");
