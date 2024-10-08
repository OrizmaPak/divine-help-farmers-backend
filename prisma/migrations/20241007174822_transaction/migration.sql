/*
  Warnings:

  - You are about to drop the column `amount` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `oldamount` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `personnel` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `registrationcharge` on the `transaction` table. All the data in the column will be lost.
  - Added the required column `credit` to the `transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `debit` to the `transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_excess_account" INT4;
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_tax_account" INT4;

-- AlterTable
ALTER TABLE "savings" ADD COLUMN     "email" BOOL;
ALTER TABLE "savings" ADD COLUMN     "sms" BOOL;
ALTER TABLE "savings" ADD COLUMN     "whatsapp" BOOL;

-- AlterTable
ALTER TABLE "savingsproduct" ADD COLUMN     "depositechargetype" STRING NOT NULL DEFAULT 'PERCENTAGE';

-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "amount";
ALTER TABLE "transaction" DROP COLUMN "oldamount";
ALTER TABLE "transaction" DROP COLUMN "personnel";
ALTER TABLE "transaction" DROP COLUMN "registrationcharge";
ALTER TABLE "transaction" ADD COLUMN     "approvedby" INT4;
ALTER TABLE "transaction" ADD COLUMN     "credit" INT4 NOT NULL;
ALTER TABLE "transaction" ADD COLUMN     "currency" STRING NOT NULL;
ALTER TABLE "transaction" ADD COLUMN     "debit" INT4 NOT NULL;
ALTER TABLE "transaction" ADD COLUMN     "description" STRING;
ALTER TABLE "transaction" ADD COLUMN     "image" STRING;
ALTER TABLE "transaction" ADD COLUMN     "reference" STRING;
ALTER TABLE "transaction" ADD COLUMN     "transactiondate" TIMESTAMP(3);
ALTER TABLE "transaction" ADD COLUMN     "transactiondesc" STRING;
ALTER TABLE "transaction" ADD COLUMN     "ttype" STRING;
ALTER TABLE "transaction" ADD COLUMN     "valuedate" TIMESTAMP(3);
ALTER TABLE "transaction" ADD COLUMN     "whichaccount" STRING;
ALTER TABLE "transaction" ALTER COLUMN "accountnumber" SET DATA TYPE STRING;
