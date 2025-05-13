/*
  Warnings:

  - You are about to drop the column `amount` on the `smscharges` table. All the data in the column will be lost.
  - You are about to drop the column `userid` on the `smscharges` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "smscharges" DROP COLUMN "amount",
DROP COLUMN "userid";
