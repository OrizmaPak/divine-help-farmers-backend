-- AlterTable
ALTER TABLE "Organisationsettings" ADD COLUMN     "personal_account_overdrawn" BOOL NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "savingsproduct" ADD COLUMN     "withdrawalcontrol" BOOL DEFAULT false;
ALTER TABLE "savingsproduct" ADD COLUMN     "withdrawalcontrolamount" FLOAT8 DEFAULT 0;
ALTER TABLE "savingsproduct" ADD COLUMN     "withdrawalcontrolsize" STRING;
ALTER TABLE "savingsproduct" ADD COLUMN     "withdrawalcontroltype" STRING;
ALTER TABLE "savingsproduct" ADD COLUMN     "withdrawalcontrolwindow" STRING;
