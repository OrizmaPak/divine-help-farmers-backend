-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "credit_charge_maximum" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "credit_charge_minimum" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "debit_charge_maximum" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "debit_charge_minimum" DOUBLE PRECISION DEFAULT 0;

-- CreateTable
CREATE TABLE "smscharges" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdby" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "smscharges_pkey" PRIMARY KEY ("id")
);
