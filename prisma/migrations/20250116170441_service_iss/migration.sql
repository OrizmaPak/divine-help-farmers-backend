/*
  Warnings:

  - You are about to drop the column `reassignedto` on the `Service` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Service" DROP COLUMN "reassignedto",
ADD COLUMN     "currency" TEXT DEFAULT 'NGN',
ADD COLUMN     "serviceid" SERIAL NOT NULL,
ADD COLUMN     "staff" INTEGER;
