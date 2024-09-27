/*
  Warnings:

  - You are about to drop the column `savingsproductId` on the `Deduction` table. All the data in the column will be lost.
  - You are about to drop the column `savingsproductId` on the `Interest` table. All the data in the column will be lost.
  - Added the required column `savingsproductid` to the `Deduction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `savingsproductid` to the `Interest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Deduction" DROP CONSTRAINT "Deduction_savingsproductId_fkey";

-- DropForeignKey
ALTER TABLE "Interest" DROP CONSTRAINT "Interest_savingsproductId_fkey";

-- AlterTable
ALTER TABLE "Deduction" DROP COLUMN "savingsproductId";
ALTER TABLE "Deduction" ADD COLUMN     "savingsproductid" INT4 NOT NULL;

-- AlterTable
ALTER TABLE "Interest" DROP COLUMN "savingsproductId";
ALTER TABLE "Interest" ADD COLUMN     "savingsproductid" INT4 NOT NULL;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_savingsproductid_fkey" FOREIGN KEY ("savingsproductid") REFERENCES "savingsproduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deduction" ADD CONSTRAINT "Deduction_savingsproductid_fkey" FOREIGN KEY ("savingsproductid") REFERENCES "savingsproduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
