/*
  Warnings:

  - Changed the type of `dateadded` on the `Cashierlimit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Cashierlimit" DROP COLUMN "dateadded",
ADD COLUMN     "dateadded" TIMESTAMP(3) NOT NULL;
