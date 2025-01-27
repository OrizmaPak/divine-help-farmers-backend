-- AlterTable
ALTER TABLE "propertyitems" ADD COLUMN     "deliveryrequestdate" TIMESTAMP(3),
ADD COLUMN     "deliveryrequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliverystatus" TEXT NOT NULL DEFAULT 'NOT STARTED',
ADD COLUMN     "readyfordelivery" BOOLEAN NOT NULL DEFAULT false;
