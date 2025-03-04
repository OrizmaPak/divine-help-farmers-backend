-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_loan_account" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "default_loan_income_account" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "default_personal_account" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "default_personal_income_account" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "default_property_income_account" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "default_rotary_income_account" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "default_savings_account" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "default_savings_income_account" DOUBLE PRECISION DEFAULT 0;
