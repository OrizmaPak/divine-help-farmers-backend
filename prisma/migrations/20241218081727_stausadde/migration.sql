/*
  Warnings:

  - You are about to drop the column `eligibilityaccountage` on the `Deduction` table. All the data in the column will be lost.
  - You are about to drop the column `eligibilitybalance` on the `Deduction` table. All the data in the column will be lost.
  - You are about to drop the column `goforapproval` on the `Deduction` table. All the data in the column will be lost.
  - You are about to drop the column `eligibilityaccountage` on the `Interest` table. All the data in the column will be lost.
  - You are about to drop the column `eligibilitybalance` on the `Interest` table. All the data in the column will be lost.
  - You are about to drop the column `goforapproval` on the `Interest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Deduction" DROP COLUMN "eligibilityaccountage";
ALTER TABLE "Deduction" DROP COLUMN "eligibilitybalance";
ALTER TABLE "Deduction" DROP COLUMN "goforapproval";
ALTER TABLE "Deduction" ADD COLUMN     "deductioneligibilityaccountage" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "Deduction" ADD COLUMN     "deductioneligibilitybalance" FLOAT8 NOT NULL DEFAULT 0;
ALTER TABLE "Deduction" ADD COLUMN     "deductiongoforapproval" BOOL NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Interest" DROP COLUMN "eligibilityaccountage";
ALTER TABLE "Interest" DROP COLUMN "eligibilitybalance";
ALTER TABLE "Interest" DROP COLUMN "goforapproval";
ALTER TABLE "Interest" ADD COLUMN     "interesteligibilityaccountage" INT4 NOT NULL DEFAULT 0;
ALTER TABLE "Interest" ADD COLUMN     "interesteligibilitybalance" FLOAT8 NOT NULL DEFAULT 0;
ALTER TABLE "Interest" ADD COLUMN     "interestgoforapproval" BOOL NOT NULL DEFAULT false;
