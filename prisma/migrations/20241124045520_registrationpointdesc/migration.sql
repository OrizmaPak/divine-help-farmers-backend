-- AlterTable
ALTER TABLE "Registrationpoint" ADD COLUMN     "description" STRING;

-- AlterTable
ALTER TABLE "loanproduct" ADD COLUMN     "eligibilitymincredit" FLOAT8;
ALTER TABLE "loanproduct" ADD COLUMN     "eligibilitymindebit" FLOAT8;

-- AlterTable
ALTER TABLE "savingsproduct" ADD COLUMN     "eligibilityaccountage" INT4;
ALTER TABLE "savingsproduct" ADD COLUMN     "eligibilityminbalance" FLOAT8;
ALTER TABLE "savingsproduct" ADD COLUMN     "eligibilitymincredit" FLOAT8;
ALTER TABLE "savingsproduct" ADD COLUMN     "eligibilitymindebit" FLOAT8;
ALTER TABLE "savingsproduct" ADD COLUMN     "eligibilityminimumclosedaccounts" INT4;
ALTER TABLE "savingsproduct" ADD COLUMN     "eligibilityminimumloan" FLOAT8;
ALTER TABLE "savingsproduct" ADD COLUMN     "eligibilityproduct" INT4 DEFAULT 0;
ALTER TABLE "savingsproduct" ADD COLUMN     "eligibilityproductcategory" STRING;
ALTER TABLE "savingsproduct" ADD COLUMN     "useraccount" INT4 DEFAULT 1;
