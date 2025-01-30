/*
  Warnings:

  - Added the required column `createdby` to the `rotaryschedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "propertyinstallments" ALTER COLUMN "delivered" SET DEFAULT 'NO',
ALTER COLUMN "delivered" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "propertyitems" ALTER COLUMN "delivered" SET DEFAULT 'NO',
ALTER COLUMN "delivered" SET DATA TYPE TEXT,
ALTER COLUMN "deliveryrequested" SET DEFAULT 'NO',
ALTER COLUMN "deliveryrequested" SET DATA TYPE TEXT,
ALTER COLUMN "readyfordelivery" SET DEFAULT 'NO',
ALTER COLUMN "readyfordelivery" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "rotaryaccount" ADD COLUMN     "member" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "userid" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "autorunnew" SET DEFAULT 'YES',
ALTER COLUMN "autorunnew" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "rotaryschedule" ADD COLUMN     "createdby" INTEGER NOT NULL,
ALTER COLUMN "currentschedule" SET DEFAULT 'YES',
ALTER COLUMN "currentschedule" SET DATA TYPE TEXT;
