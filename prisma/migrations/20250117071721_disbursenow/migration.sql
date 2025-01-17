/*
  Warnings:

  - The `serviceid` column on the `Service` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Service" DROP COLUMN "serviceid",
ADD COLUMN     "serviceid" UUID NOT NULL DEFAULT gen_random_uuid();
