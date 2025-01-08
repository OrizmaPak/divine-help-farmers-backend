-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "addition_loan_registration_charge" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "loanaccounts" ADD COLUMN     "disbursementref" TEXT DEFAULT '';
