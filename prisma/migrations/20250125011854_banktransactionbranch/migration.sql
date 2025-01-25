/*
  Warnings:

  - You are about to drop the column `itemid` on the `propertyinstallments` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `propertyinstallments` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `propertyinstallments` table. All the data in the column will be lost.
  - Added the required column `duedate` to the `propertyinstallments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "propertyinstallments" DROP COLUMN "itemid",
DROP COLUMN "price",
DROP COLUMN "qty",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "delivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" TEXT DEFAULT '',
ADD COLUMN     "duedate" TIMESTAMP(3) NOT NULL;
