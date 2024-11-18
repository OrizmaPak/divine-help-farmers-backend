-- AlterTable
ALTER TABLE "loanaccounts" ADD COLUMN     "seperateinterest" BOOL DEFAULT false;

-- AlterTable
ALTER TABLE "loanproduct" ADD COLUMN     "seperateinterest" BOOL DEFAULT false;
