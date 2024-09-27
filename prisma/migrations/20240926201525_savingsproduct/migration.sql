/*
  Warnings:

  - You are about to drop the column `createdAt` on the `savingsproduct` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `savingsproduct` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "savingsproduct" DROP COLUMN "createdAt";
ALTER TABLE "savingsproduct" DROP COLUMN "updatedAt";
ALTER TABLE "savingsproduct" ADD COLUMN     "dateadded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "savingsproduct" ADD COLUMN     "updatedat" TIMESTAMP(3);
