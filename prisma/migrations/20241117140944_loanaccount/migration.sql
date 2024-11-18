/*
  Warnings:

  - You are about to drop the column `loanaccount` on the `loanaccounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "loanaccounts" DROP COLUMN "loanaccount";
ALTER TABLE "loanaccounts" ADD COLUMN     "accountnumber" STRING;
ALTER TABLE "loanaccounts" ADD COLUMN     "loanproduct" INT4 DEFAULT 0;
