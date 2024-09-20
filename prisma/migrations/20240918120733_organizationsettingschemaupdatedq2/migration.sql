/*
  Warnings:

  - You are about to drop the column `telephone` on the `Organisationsettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organisationsettings" DROP COLUMN "telephone";
ALTER TABLE "Organisationsettings" ADD COLUMN     "phone" STRING NOT NULL DEFAULT '';
ALTER TABLE "Organisationsettings" ALTER COLUMN "mobile" SET DEFAULT '';
