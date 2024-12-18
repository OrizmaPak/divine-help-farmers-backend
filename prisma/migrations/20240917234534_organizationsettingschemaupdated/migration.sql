-- AlterSequence
ALTER SEQUENCE "Branch_id_seq" MAXVALUE 9223372036854775807;

-- CreateEnum
CREATE TYPE "Yn" AS ENUM ('YES', 'NO');

-- CreateTable
CREATE TABLE "Accounts" (
    "id" INT4 NOT NULL GENERATED BY DEFAULT AS IDENTITY,

    CONSTRAINT "Accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisationsettings" (
    "id" INT4 NOT NULL DEFAULT 1,
    "company_name" STRING NOT NULL,
    "sms_sender_id" STRING NOT NULL,
    "telephone" INT4 NOT NULL,
    "mobile" STRING NOT NULL,
    "email" STRING NOT NULL,
    "address" STRING NOT NULL,
    "logo" STRING,
    "sms_charge" INT4,
    "maintenace_charge" INT4,
    "vat_rate_percent" INT4 NOT NULL DEFAULT 0,
    "addition_savings_registration_charge" INT4,
    "allow_back_dated_transaction" "Yn" NOT NULL DEFAULT 'NO',
    "allow_future_transaction" "Yn" NOT NULL DEFAULT 'NO',
    "set_accounting_year_end" TIMESTAMP(3),
    "schedule_maintenace_charge" "Yn" NOT NULL DEFAULT 'NO',
    "sms_charge_members" "Yn" NOT NULL DEFAULT 'YES',
    "savings_account_prefix" INT4,
    "personal_account_prefix" STRING NOT NULL DEFAULT 'DHF',
    "loan_transaction_prefix" INT4,
    "savings_transaction_prefix" INT4,
    "loan_account_prefix" INT4,
    "asset_account_prefix" INT4,
    "cash_account_prefix" INT4,
    "current_assets_account_prefix" INT4,
    "expense_account_prefix" INT4,
    "income_account_prefix" INT4,
    "equity_retained_earnings_account_prefix" INT4,
    "equity_does_not_close_prefix" INT4,
    "inventory_account_prefix" INT4,
    "other_asset_account_prefix" INT4,
    "cost_of_sales_account_prefix" INT4,
    "fixed_asset_account_prefix" INT4,
    "other_current_asset_account_prefix" INT4,
    "accounts_payable_account_prefix" INT4,
    "accounts_receivable_account_prefix" INT4,
    "accumulated_depreciation_account_prefix" INT4,
    "liabilities_account_prefix" INT4,
    "other_current_liabilities_account_prefix" INT4,
    "long_term_liabilities_account_prefix" INT4,
    "equity_account_prefix" INT4,
    "default_sms_charge_account" INT4,
    "default_asset_account" INT4,
    "default_cash_account" INT4,
    "default_current_assets_account" INT4,
    "default_expense_account" INT4,
    "default_income_account" INT4,
    "default_equity_retained_earnings_account" INT4,
    "default_equity_does_not_close_account" INT4,
    "default_inventory_account" INT4,
    "default_other_asset_account" INT4,
    "default_cost_of_sales_account" INT4,
    "default_fixed_asset_account" INT4,
    "default_other_current_asset_account" INT4,
    "default_accounts_payable_account" INT4,
    "default_accounts_receivable_account" INT4,
    "default_accumulated_depreciation_account" INT4,
    "default_liabilities_account" INT4,
    "default_other_current_liabilities_account" INT4,
    "default_long_term_liabilities_account" INT4,
    "default_equity_account" INT4,

    CONSTRAINT "Organisationsettings_pkey" PRIMARY KEY ("id")
);
