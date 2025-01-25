-- AlterTable
ALTER TABLE "propertyinstallments" ADD COLUMN     "transactionref" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "propertyitems" ADD COLUMN     "delivered" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "propertyproduct" ADD COLUMN     "description" TEXT DEFAULT '';
