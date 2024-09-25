-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "reference" STRING;
ALTER TABLE "Inventory" ADD COLUMN     "transactiondate" STRING;
ALTER TABLE "Inventory" ADD COLUMN     "transactiondesc" STRING;
ALTER TABLE "Inventory" ALTER COLUMN "cost" DROP NOT NULL;
ALTER TABLE "Inventory" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE "Inventory" ALTER COLUMN "pricetwo" DROP NOT NULL;
ALTER TABLE "Inventory" ALTER COLUMN "beginbalance" DROP NOT NULL;
ALTER TABLE "Inventory" ALTER COLUMN "qty" DROP NOT NULL;
ALTER TABLE "Inventory" ALTER COLUMN "minimumbalance" DROP NOT NULL;
