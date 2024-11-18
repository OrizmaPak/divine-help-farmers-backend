/*
  Warnings:

  - Added the required column `createdby` to the `loanaccounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateadded` to the `loanaccounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `loanamount` to the `loanaccounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userid` to the `loanaccounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "loanaccounts" ADD COLUMN     "closeamount" FLOAT8;
ALTER TABLE "loanaccounts" ADD COLUMN     "createdby" INT4 NOT NULL;
ALTER TABLE "loanaccounts" ADD COLUMN     "dateadded" TIMESTAMP(3) NOT NULL;
ALTER TABLE "loanaccounts" ADD COLUMN     "dateclosed" TIMESTAMP(3);
ALTER TABLE "loanaccounts" ADD COLUMN     "loanamount" FLOAT8 NOT NULL;
ALTER TABLE "loanaccounts" ADD COLUMN     "status" STRING NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "loanaccounts" ADD COLUMN     "userid" INT4 NOT NULL;
ALTER TABLE "loanaccounts" ALTER COLUMN "bankaccountnumber1" SET DATA TYPE STRING;

-- AlterTable
ALTER TABLE "loanproduct" ADD COLUMN     "eligibilityaccountage" INT4;
ALTER TABLE "loanproduct" ADD COLUMN     "eligibilityminbalance" FLOAT8;
ALTER TABLE "loanproduct" ADD COLUMN     "eligibilityminimumclosedaccounts" INT4;
ALTER TABLE "loanproduct" ADD COLUMN     "eligibilityminimumloan" FLOAT8;
ALTER TABLE "loanproduct" ADD COLUMN     "eligibilityproduct" INT4 DEFAULT 0;
ALTER TABLE "loanproduct" ADD COLUMN     "eligibilityproductcategory" STRING;
ALTER TABLE "loanproduct" ADD COLUMN     "eligibilitytype" STRING;
ALTER TABLE "loanproduct" ADD COLUMN     "maximumloan" FLOAT8;
ALTER TABLE "loanproduct" ADD COLUMN     "minimumloan" FLOAT8;
ALTER TABLE "loanproduct" ADD COLUMN     "useraccount" INT4 DEFAULT 1;
