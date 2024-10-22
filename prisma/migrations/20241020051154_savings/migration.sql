/*
  Warnings:

  - The `savings_account_prefix` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "personal_transaction_prefix" STRING;
ALTER TABLE "Organisationsettings" DROP COLUMN "savings_account_prefix";
ALTER TABLE "Organisationsettings" ADD COLUMN     "savings_account_prefix" STRING;
