/*
  Warnings:

  - You are about to drop the column `chargerage` on the `loanfee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "loanfee" DROP COLUMN "chargerage";
ALTER TABLE "loanfee" ADD COLUMN     "chargeamount" FLOAT8;
ALTER TABLE "loanfee" ADD COLUMN     "chargetype" STRING;
