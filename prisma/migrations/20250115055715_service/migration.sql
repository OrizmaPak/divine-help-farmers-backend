/*
  Warnings:

  - You are about to drop the column `duration` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `durationcategory` on the `Service` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Service" DROP COLUMN "duration",
DROP COLUMN "durationcategory",
ADD COLUMN     "serviceenddate" TIMESTAMP(3),
ADD COLUMN     "servicestartdate" TIMESTAMP(3);
