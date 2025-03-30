const { StatusCodes } = require("http-status-codes");
const pg = require("../../../../db/pg");


const getDefaultAccountKeysAndNames = async (req, res) => {
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

        const accountDetails = defaultAccountKeys.map(accountKey => {
            const accountName = accountKey.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
            return {
                key: accountKey,
                accountName
            };
        });

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Default account keys and names fetched successfully",
            statuscode: StatusCodes.OK,
            data: accountDetails,
            errors: []
        });
    } catch (error) {
        console.error("Unexpected Error:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Failed to fetch default account keys and names",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getDefaultAccountKeysAndNames };
