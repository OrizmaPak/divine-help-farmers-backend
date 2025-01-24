-- AlterTable
ALTER TABLE "propertyaccount" ADD COLUMN     "numberofrepayments" INTEGER,
ADD COLUMN     "percentagedelivery" INTEGER,
ADD COLUMN     "repaymentfrequency" TEXT;

-- CreateTable
CREATE TABLE "propertyinstallments" (
    "id" SERIAL NOT NULL,
    "accountnumber" TEXT NOT NULL,
    "itemid" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "userid" INTEGER NOT NULL,
    "createdby" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propertyinstallments_pkey" PRIMARY KEY ("id")
);
