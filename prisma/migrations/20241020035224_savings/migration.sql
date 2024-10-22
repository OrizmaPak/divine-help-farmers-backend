/*
  Warnings:

  - You are about to drop the column `accountname1` on the `savings` table. All the data in the column will be lost.
  - You are about to drop the column `accountname2` on the `savings` table. All the data in the column will be lost.
  - You are about to drop the column `accontuser` on the `transaction` table. All the data in the column will be lost.
  - Added the required column `userid` to the `transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "savings" DROP COLUMN "accountname1";
ALTER TABLE "savings" DROP COLUMN "accountname2";
ALTER TABLE "savings" ADD COLUMN     "bankaccountname1" STRING;
ALTER TABLE "savings" ADD COLUMN     "bankaccountname2" INT4;
ALTER TABLE "savings" ADD COLUMN     "bankaccountnumber1" INT4;
ALTER TABLE "savings" ADD COLUMN     "bankaccountnumber2" STRING;
ALTER TABLE "savings" ALTER COLUMN "registrationpoint" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "accontuser";
ALTER TABLE "transaction" ADD COLUMN     "userid" INT4 NOT NULL;
ALTER TABLE "transaction" ALTER COLUMN "branch" DROP NOT NULL;
ALTER TABLE "transaction" ALTER COLUMN "registrationpoint" DROP NOT NULL;
ALTER TABLE "transaction" ALTER COLUMN "whichaccount" DROP NOT NULL;
