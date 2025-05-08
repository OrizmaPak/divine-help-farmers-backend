-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "credit_charge" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "credit_charge_type" TEXT DEFAULT 'AMOUNT',
ADD COLUMN     "debit_charge" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "debit_charge_type" TEXT DEFAULT 'AMOUNT';
