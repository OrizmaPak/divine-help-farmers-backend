/*
  Warnings:

  - You are about to drop the column `accountnumber` on the `pendingofflinetransaction` table. All the data in the column will be lost.
  - You are about to drop the column `accounttype` on the `pendingofflinetransaction` table. All the data in the column will be lost.
  - You are about to drop the column `product` on the `pendingofflinetransaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pendingofflinetransaction" DROP COLUMN "accountnumber",
DROP COLUMN "accounttype",
DROP COLUMN "product",
ADD COLUMN     "accountnumberfrom" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "accountnumberto" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "accounttypefrom" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "accounttypeto" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "productfrom" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "productto" TEXT NOT NULL DEFAULT '';
