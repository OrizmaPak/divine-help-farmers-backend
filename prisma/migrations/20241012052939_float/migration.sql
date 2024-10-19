/*
  Warnings:

  - The `cost` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `price` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `pricetwo` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `beginbalance` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `qty` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `minimumbalance` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `sellingprice` column on the `Inventory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `sms_charge` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `maintenace_charge` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `vat_rate_percent` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `addition_savings_registration_charge` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `initial_member_savings_prefix` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_sms_charge_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_asset_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_cash_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_current_assets_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_expense_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_income_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_equity_retained_earnings_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_equity_does_not_close_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_inventory_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_other_asset_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_cost_of_sales_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_fixed_asset_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_other_current_asset_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_accounts_payable_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_accounts_receivable_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_accumulated_depreciation_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_liabilities_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_other_current_liabilities_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_long_term_liabilities_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_equity_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_excess_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_tax_account` column on the `Organisationsettings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `compulsorydepositfrequencyamount` column on the `savingsproduct` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `credit` column on the `transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `debit` column on the `transaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `depositlimit` on the `Cashierlimit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `withdrawallimit` on the `Cashierlimit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `amount` on the `savings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `registrationcharge` on the `savings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `whichaccount` on table `transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Cashierlimit" DROP COLUMN "depositlimit";
ALTER TABLE "Cashierlimit" ADD COLUMN     "depositlimit" FLOAT8 NOT NULL;
ALTER TABLE "Cashierlimit" DROP COLUMN "withdrawallimit";
ALTER TABLE "Cashierlimit" ADD COLUMN     "withdrawallimit" FLOAT8 NOT NULL;

-- AlterTable
ALTER TABLE "Deduction" ALTER COLUMN "deductionfrequencynumber" DROP NOT NULL;
ALTER TABLE "Deduction" ALTER COLUMN "deductionfrequencyskip" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Interest" ALTER COLUMN "interestfrequencynumber" DROP NOT NULL;
ALTER TABLE "Interest" ALTER COLUMN "interestfrequencyskip" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "cost";
ALTER TABLE "Inventory" ADD COLUMN     "cost" FLOAT8;
ALTER TABLE "Inventory" DROP COLUMN "price";
ALTER TABLE "Inventory" ADD COLUMN     "price" FLOAT8;
ALTER TABLE "Inventory" DROP COLUMN "pricetwo";
ALTER TABLE "Inventory" ADD COLUMN     "pricetwo" FLOAT8;
ALTER TABLE "Inventory" DROP COLUMN "beginbalance";
ALTER TABLE "Inventory" ADD COLUMN     "beginbalance" FLOAT8;
ALTER TABLE "Inventory" DROP COLUMN "qty";
ALTER TABLE "Inventory" ADD COLUMN     "qty" FLOAT8;
ALTER TABLE "Inventory" DROP COLUMN "minimumbalance";
ALTER TABLE "Inventory" ADD COLUMN     "minimumbalance" FLOAT8;
ALTER TABLE "Inventory" DROP COLUMN "sellingprice";
ALTER TABLE "Inventory" ADD COLUMN     "sellingprice" FLOAT8;

-- AlterTable
ALTER TABLE "Organisationsettings" DROP COLUMN "sms_charge";
ALTER TABLE "Organisationsettings" ADD COLUMN     "sms_charge" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "maintenace_charge";
ALTER TABLE "Organisationsettings" ADD COLUMN     "maintenace_charge" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "vat_rate_percent";
ALTER TABLE "Organisationsettings" ADD COLUMN     "vat_rate_percent" FLOAT8 NOT NULL DEFAULT 0;
ALTER TABLE "Organisationsettings" DROP COLUMN "addition_savings_registration_charge";
ALTER TABLE "Organisationsettings" ADD COLUMN     "addition_savings_registration_charge" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "initial_member_savings_prefix";
ALTER TABLE "Organisationsettings" ADD COLUMN     "initial_member_savings_prefix" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_sms_charge_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_sms_charge_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_asset_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_asset_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_cash_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_cash_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_current_assets_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_current_assets_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_expense_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_expense_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_income_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_income_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_equity_retained_earnings_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_equity_retained_earnings_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_equity_does_not_close_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_equity_does_not_close_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_inventory_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_inventory_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_other_asset_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_other_asset_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_cost_of_sales_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_cost_of_sales_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_fixed_asset_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_fixed_asset_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_other_current_asset_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_other_current_asset_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_accounts_payable_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_accounts_payable_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_accounts_receivable_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_accounts_receivable_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_accumulated_depreciation_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_accumulated_depreciation_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_liabilities_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_liabilities_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_other_current_liabilities_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_other_current_liabilities_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_long_term_liabilities_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_long_term_liabilities_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_equity_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_equity_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_excess_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_excess_account" FLOAT8;
ALTER TABLE "Organisationsettings" DROP COLUMN "default_tax_account";
ALTER TABLE "Organisationsettings" ADD COLUMN     "default_tax_account" FLOAT8;

-- AlterTable
ALTER TABLE "savings" DROP COLUMN "amount";
ALTER TABLE "savings" ADD COLUMN     "amount" FLOAT8 NOT NULL;
ALTER TABLE "savings" DROP COLUMN "registrationcharge";
ALTER TABLE "savings" ADD COLUMN     "registrationcharge" FLOAT8 NOT NULL;

-- AlterTable
ALTER TABLE "savingsproduct" ADD COLUMN     "chargehere" BOOL NOT NULL DEFAULT false;
ALTER TABLE "savingsproduct" ADD COLUMN     "compulsorydepositdeficit" BOOL NOT NULL DEFAULT false;
ALTER TABLE "savingsproduct" DROP COLUMN "compulsorydepositfrequencyamount";
ALTER TABLE "savingsproduct" ADD COLUMN     "compulsorydepositfrequencyamount" FLOAT8;
ALTER TABLE "savingsproduct" ALTER COLUMN "compulsorydepositfrequencyskip" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "accontuser" INT4;
ALTER TABLE "transaction" ADD COLUMN     "tax" BOOL DEFAULT false;
ALTER TABLE "transaction" DROP COLUMN "credit";
ALTER TABLE "transaction" ADD COLUMN     "credit" FLOAT8 NOT NULL DEFAULT 0;
ALTER TABLE "transaction" DROP COLUMN "debit";
ALTER TABLE "transaction" ADD COLUMN     "debit" FLOAT8 NOT NULL DEFAULT 0;
ALTER TABLE "transaction" ALTER COLUMN "whichaccount" SET NOT NULL;
