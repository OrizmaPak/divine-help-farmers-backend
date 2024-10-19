/*
  Warnings:

  - You are about to drop the column `personnel` on the `savings` table. All the data in the column will be lost.
  - Added the required column `userid` to the `savings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "minimum_credit_amount" FLOAT8 NOT NULL DEFAULT 2000;
ALTER TABLE "Organisationsettings" ADD COLUMN     "minimum_credit_amount_penalty" FLOAT8 NOT NULL DEFAULT 200;

-- AlterTable
ALTER TABLE "savings" DROP COLUMN "personnel";
ALTER TABLE "savings" ADD COLUMN     "userid" INT4 NOT NULL;
