/**
 * Below is a sample controller following your request:
 * 1. It fetches all default account values from Organisationsettings (id=1).
 * 2. For each default account that has a numeric value (not null or 0),
 *    it sums credit minus debit from the "transaction" table for status 'ACTIVE'.
 * 3. It also fetches the last 30 days of transactions for each account.
 * 4. It returns a JSON with the computed balances, including total credit and total debit for each account,
 *    plus the transactions from the last 30 days.
 */

// Start Generation Here
const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");

const getGLBalances = async (req, res) => {
    try {
        // Fetch the default accounts from the Organisationsettings table
        const orgSettingsQuery = {
            text: `SELECT * FROM divine."Organisationsettings" WHERE id = 1 LIMIT 1`,
            values: []
        };
        const { rows } = await pg.query(orgSettingsQuery);

        if (!rows.length) {  
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Organisationsettings not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const orgSettings = rows[0];

        // Collect all the default account fields we want to check
        const defaultAccountKeys = [
            "default_personal_account",
            "default_property_account",
            "default_rotary_account",
            "default_loan_account",
            "default_savings_account",
            "default_personal_income_account",
            "default_property_income_account",
            "default_loan_income_account",
            "default_savings_income_account",
            "default_rotary_income_account",
            "default_cash_account",
            "default_sms_charge_account",
            "default_asset_account",
            "default_current_assets_account",
            "default_expense_account",
            "default_income_account",
            "default_equity_retained_earnings_account",
            "default_equity_does_not_close_account",
            "default_inventory_account",
            "default_other_asset_account",
            "default_cost_of_sales_account",
            "default_fixed_asset_account",
            "default_other_current_asset_account",
            "default_accounts_payable_account",
            "default_accounts_receivable_account",
            "default_accumulated_depreciation_account",
            "default_liabilities_account",
            "default_other_current_liabilities_account",
            "default_long_term_liabilities_account",
            "default_equity_account",
            "default_tax_account",
            "default_excess_account"
        ];

        const balances = {};

        // For each default account, compute the balance if the account is valid
        for (const accountKey of defaultAccountKeys) {
            const accountNumber = orgSettings[accountKey];
            const accountName = accountKey.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

            if (accountNumber && accountNumber !== 0) {
                // Query the transaction table for the sum of credit and debit
                const sumQuery = {
                    text: `SELECT COALESCE(SUM(credit),0) AS totalcredit, COALESCE(SUM(debit),0) AS totaldebit
                           FROM divine."transaction"
                           WHERE status = 'ACTIVE'
                           AND accountnumber = $1`,
                    values: [accountNumber]
                };
                const { rows: [transSum] } = await pg.query(sumQuery);

                // Query the transaction table for the last 30 days of transactions
                const last30DaysQuery = {
                    text: `SELECT *
                           FROM divine."transaction"
                           WHERE status = 'ACTIVE'
                           AND accountnumber = $1
                           AND transactiondate >= CURRENT_DATE - INTERVAL '30 days'
                           ORDER BY transactiondate DESC`,
                    values: [accountNumber]
                };
                const { rows: last30DaysTransactions } = await pg.query(last30DaysQuery);

                const balance = parseFloat(transSum.totalcredit) - parseFloat(transSum.totaldebit);

                balances[accountKey] = {
                    accountNumber,
                    accountName,
                    balance,
                    totalCredit: parseFloat(transSum.totalcredit),
                    totalDebit: parseFloat(transSum.totaldebit),
                    last30DaysTransactions
                };
            } else {
                balances[accountKey] = {
                    accountNumber: accountNumber || null,
                    accountName,
                    balance: 0,
                    totalCredit: 0,
                    totalDebit: 0,
                    last30DaysTransactions: []
                };
            }
        }

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "GL Balances fetched successfully",
            statuscode: StatusCodes.OK,
            data: balances,
            errors: []
        });
    } catch (error) {
        console.error("Unexpected Error:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Failed to fetch GL Balances",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getGLBalances };
