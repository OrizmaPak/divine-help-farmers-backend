const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { uploadToGoogleDrive } = require("../../../utils/uploadToGoogleDrive");
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware

const organizationsettings = async (req, res) => {
    if(req.files) await uploadToGoogleDrive(req, res);
    const company_name = req.body.company_name;
    const sms_sender_id = req.body.sms_sender_id;
    const phone = req.body.phone || "234";
    const mobile = req.body.mobile || "234";
    const email = req.body.email;
    const address = req.body.address;
    const logo = req.body.logo;
    const sms_charge = req.body.sms_charge || 0;
    const maintenace_charge = req.body.maintenace_charge || 0;
    const vat_rate_percent = req.body.vat_rate_percent || 0;
    const addition_savings_registration_charge = req.body.additional_savings_registration_charge || 0;
    const allow_back_dated_transaction = req.body.allow_back_dated_transaction || "NO";
    const allow_future_transaction = req.body.allow_future_transaction || "NO";
    const set_accounting_year_end = req.body.set_accounting_year_end || null;
    const schedule_maintenace_charge = req.body.schedule_maintenace_charge || "NO";
    const sms_charge_members = req.body.sms_charge_members || "YES";
    const initial_member_savings_prefix = req.body.initial_member_savings_prefix || null;
    const personal_account_prefix = req.body.personal_account_prefix || "DHF";
    const loan_transaction_prefix = req.body.loan_transaction_prefix || null;
    const member_transaction_prefix = req.body.member_transaction_prefix || null;
    const loan_account_prefix = req.body.loan_account_prefix || null;
    const asset_account_prefix = req.body.asset_account_prefix || null;
    const cash_account_prefix = req.body.cash_account_prefix || null;
    const current_assets_account_prefix = req.body.current_assets_account_prefix || null;
    const expense_account_prefix = req.body.expense_account_prefix || null;
    const income_account_prefix = req.body.income_account_prefix || null;
    const equity_retained_earnings_account_prefix = req.body.equity_retained_earnings_account_prefix || null;
    const equity_does_not_close_prefix = req.body.equity_does_not_close_prefix || null;
    const inventory_account_prefix = req.body.inventory_account_prefix || null;
    const other_asset_account_prefix = req.body.other_asset_account_prefix || null;
    const cost_of_sales_account_prefix = req.body.cost_of_sales_account_prefix || null;
    const fixed_asset_account_prefix = req.body.fixed_asset_account_prefix || null;
    const other_current_asset_account_prefix = req.body.other_current_asset_account_prefix || null;
    const accounts_payable_account_prefix = req.body.accounts_payable_account_prefix || null;
    const accounts_receivable_account_prefix = req.body.accounts_receivable_account_prefix || null;
    const accumulated_depreciation_account_prefix = req.body.accumulated_depreciation_account_prefix || null;
    const liabilities_account_prefix = req.body.liabilities_account_prefix || null;
    const other_current_liabilities_account_prefix = req.body.other_current_liabilities_account_prefix || null;
    const long_term_liabilities_account_prefix = req.body.long_term_liabilities_account_prefix || null;
    const equity_account_prefix = req.body.equity_account_prefix || null;
    const default_sms_charge_account = req.body.default_sms_charge_account || 0;
    const default_asset_account = req.body.default_asset_account || 0;
    const default_cash_account = req.body.default_cash_account || 0;
    const default_current_assets_account = req.body.default_current_assets_account || 0;
    const default_expense_account = req.body.default_expense_account || 0;
    const default_income_account = req.body.default_income_account || 0;
    const default_equity_retained_earnings_account = req.body.default_equity_retained_earnings_account || 0;
    const default_equity_does_not_close_account = req.body.default_equity_does_not_close_account || 0;
    const default_inventory_account = req.body.default_inventory_account || 0;
    const default_other_asset_account = req.body.default_other_asset_account || 0;
    const default_cost_of_sales_account = req.body.default_cost_of_sales_account || 0;
    const default_fixed_asset_account = req.body.default_fixed_asset_account || 0;
    const default_other_current_asset_account = req.body.default_other_current_asset_account || 0;
    const default_accounts_payable_account = req.body.default_accounts_payable_account || 0;
    const default_accounts_receivable_account = req.body.default_accounts_receivable_account || 0;
    const default_accumulated_depreciation_account = req.body.default_accumulated_depreciation_account || 0;
    const default_liabilities_account = req.body.default_liabilities_account || 0;
    const default_other_current_liabilities_account = req.body.default_other_current_liabilities_account || 0;
    const default_long_term_liabilities_account = req.body.default_long_term_liabilities_account || 0;
    const default_equity_account = req.body.default_equity_account || 0;
    
    const id = 1
    // const user = req.user

    // Basic validation
    if (!company_name || !sms_sender_id || !phone || !mobile || !email || !address) {
        let errors = [];
        if (!company_name) {
            errors.push({
                field: 'Company Name',
                message: 'Company name not found' 
            }); 
        }
        if (!sms_sender_id) {
            errors.push({
                field: 'SMS Sender ID',
                message: 'SMS sender ID not found' 
            }); 
        }
        if (!phone) {
            errors.push({
                field: 'phone',
                message: 'phone not found' 
            }); 
        }
        if (!mobile) {
            errors.push({
                field: 'Mobile',
                message: 'Mobile not found' 
            }); 
        }
        if (!email) {
            errors.push({
                field: 'Email',
                message: 'Email not found' 
            }); 
        }
        if (!address) {
            errors.push({
                field: 'Address',
                message: 'Address not found' 
            }); 
        }

        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Missing Fields",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: errors
        });
    }

    try {
        console.log({company_name, sms_sender_id, phone, mobile, email, address, logo, sms_charge, maintenace_charge, vat_rate_percent, addition_savings_registration_charge, allow_back_dated_transaction, allow_future_transaction, set_accounting_year_end, schedule_maintenace_charge, sms_charge_members, initial_member_savings_prefix, personal_account_prefix, loan_transaction_prefix, member_transaction_prefix, loan_account_prefix, asset_account_prefix, cash_account_prefix, current_assets_account_prefix, expense_account_prefix, income_account_prefix, equity_retained_earnings_account_prefix, equity_does_not_close_prefix, inventory_account_prefix, other_asset_account_prefix, cost_of_sales_account_prefix, fixed_asset_account_prefix, other_current_asset_account_prefix, accounts_payable_account_prefix, accounts_receivable_account_prefix, accumulated_depreciation_account_prefix, liabilities_account_prefix, other_current_liabilities_account_prefix, long_term_liabilities_account_prefix, equity_account_prefix, default_sms_charge_account, default_asset_account, default_cash_account, default_current_assets_account, default_expense_account, default_income_account, default_equity_retained_earnings_account, default_equity_does_not_close_account, default_inventory_account, default_other_asset_account, default_cost_of_sales_account, default_fixed_asset_account, default_other_current_asset_account, default_accounts_payable_account, default_accounts_receivable_account, default_accumulated_depreciation_account, default_liabilities_account, default_other_current_liabilities_account, default_long_term_liabilities_account, default_equity_account, id})
        // Since there can only be one row, we directly update the existing row
        const query = await pg.query(`UPDATE divine."Organisationsettings" SET 
            company_name = COALESCE($1, company_name),
            sms_sender_id = COALESCE($2, sms_sender_id),
            phone = COALESCE($3, phone),
            mobile = COALESCE($4, mobile),
            email = COALESCE($5, email),
            address = COALESCE($6, address),
            logo = COALESCE(NULLIF($7, ''), logo),
            sms_charge = COALESCE($8, sms_charge),
            maintenace_charge = COALESCE($9, maintenace_charge),
            vat_rate_percent = COALESCE($10, vat_rate_percent),
            addition_savings_registration_charge = COALESCE($11, addition_savings_registration_charge),
            allow_back_dated_transaction = COALESCE($12, allow_back_dated_transaction),
            allow_future_transaction = COALESCE($13, allow_future_transaction),
            set_accounting_year_end = COALESCE($14, set_accounting_year_end),
            schedule_maintenace_charge = COALESCE($15, schedule_maintenace_charge),
            sms_charge_members = COALESCE($16, sms_charge_members),
            initial_member_savings_prefix = COALESCE($17, initial_member_savings_prefix),
            personal_account_prefix = COALESCE($18, personal_account_prefix),
            loan_transaction_prefix = COALESCE($19, loan_transaction_prefix),
            member_transaction_prefix = COALESCE($20, member_transaction_prefix),
            loan_account_prefix = COALESCE($21, loan_account_prefix),
            asset_account_prefix = COALESCE($22, asset_account_prefix),
            cash_account_prefix = COALESCE($23, cash_account_prefix),
            current_assets_account_prefix = COALESCE($24, current_assets_account_prefix),
            expense_account_prefix = COALESCE($25, expense_account_prefix),
            income_account_prefix = COALESCE($26, income_account_prefix),
            equity_retained_earnings_account_prefix = COALESCE($27, equity_retained_earnings_account_prefix),
            equity_does_not_close_prefix = COALESCE($28, equity_does_not_close_prefix),
            inventory_account_prefix = COALESCE($29, inventory_account_prefix),
            other_asset_account_prefix = COALESCE($30, other_asset_account_prefix),
            cost_of_sales_account_prefix = COALESCE($31, cost_of_sales_account_prefix),
            fixed_asset_account_prefix = COALESCE($32, fixed_asset_account_prefix),
            other_current_asset_account_prefix = COALESCE($33, other_current_asset_account_prefix),
            accounts_payable_account_prefix = COALESCE($34, accounts_payable_account_prefix),
            accounts_receivable_account_prefix = COALESCE($35, accounts_receivable_account_prefix),
            accumulated_depreciation_account_prefix = COALESCE($36, accumulated_depreciation_account_prefix),
            liabilities_account_prefix = COALESCE($37, liabilities_account_prefix),
            other_current_liabilities_account_prefix = COALESCE($38, other_current_liabilities_account_prefix),
            long_term_liabilities_account_prefix = COALESCE($39, long_term_liabilities_account_prefix),
            equity_account_prefix = COALESCE($40, equity_account_prefix),
            default_sms_charge_account = COALESCE($41, default_sms_charge_account),
            default_asset_account = COALESCE($42, default_asset_account),
            default_cash_account = COALESCE($43, default_cash_account),
            default_current_assets_account = COALESCE($44, default_current_assets_account),
            default_expense_account = COALESCE($45, default_expense_account),
            default_income_account = COALESCE($46, default_income_account),
            default_equity_retained_earnings_account = COALESCE($47, default_equity_retained_earnings_account),
            default_equity_does_not_close_account = COALESCE($48, default_equity_does_not_close_account),
            default_inventory_account = COALESCE($49, default_inventory_account),
            default_other_asset_account = COALESCE($50, default_other_asset_account),
            default_cost_of_sales_account = COALESCE($51, default_cost_of_sales_account),
            default_fixed_asset_account = COALESCE($52, default_fixed_asset_account),
            default_other_current_asset_account = COALESCE($53, default_other_current_asset_account),
            default_accounts_payable_account = COALESCE($54, default_accounts_payable_account),
            default_accounts_receivable_account = COALESCE($55, default_accounts_receivable_account),
            default_accumulated_depreciation_account = COALESCE($56, default_accumulated_depreciation_account),
            default_liabilities_account = COALESCE($57, default_liabilities_account),
            default_other_current_liabilities_account = COALESCE($58, default_other_current_liabilities_account),
            default_long_term_liabilities_account = COALESCE($59, default_long_term_liabilities_account),
            default_equity_account = COALESCE($60, default_equity_account)
            WHERE id = $61`, [
                company_name, sms_sender_id, phone, mobile, email, address, logo, sms_charge, maintenace_charge, vat_rate_percent, addition_savings_registration_charge, allow_back_dated_transaction, allow_future_transaction, set_accounting_year_end, schedule_maintenace_charge, sms_charge_members, initial_member_savings_prefix, personal_account_prefix, loan_transaction_prefix, member_transaction_prefix, loan_account_prefix, asset_account_prefix, cash_account_prefix, current_assets_account_prefix, expense_account_prefix, income_account_prefix, equity_retained_earnings_account_prefix, equity_does_not_close_prefix, inventory_account_prefix, other_asset_account_prefix, cost_of_sales_account_prefix, fixed_asset_account_prefix, other_current_asset_account_prefix, accounts_payable_account_prefix, accounts_receivable_account_prefix, accumulated_depreciation_account_prefix, liabilities_account_prefix, other_current_liabilities_account_prefix, long_term_liabilities_account_prefix, equity_account_prefix, default_sms_charge_account, default_asset_account, default_cash_account, default_current_assets_account, default_expense_account, default_income_account, default_equity_retained_earnings_account, default_equity_does_not_close_account, default_inventory_account, default_other_asset_account, default_cost_of_sales_account, default_fixed_asset_account, default_other_current_asset_account, default_accounts_payable_account, default_accounts_receivable_account, default_accumulated_depreciation_account, default_liabilities_account, default_other_current_liabilities_account, default_long_term_liabilities_account, default_equity_account, id
            ]);

        const { rowCount: savebranch } = query

        // RECORD THE ACTIVITY
        await activityMiddleware(res, user.id, `${company_name} Organization Settings ${!id ? 'created' : 'updated'}`, 'ORGANIZATION_SETTINGS');

 
        const responseData = {
            status: true,
            message: `${company_name} successfully ${!id ? 'created' : 'updated'}`,
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        };

        if(savebranch > 0)return res.status(StatusCodes.OK).json(responseData);
    } catch (err) {
        console.error('Unexpected Error:', err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: []
        }); 
    }
}   

 
module.exports = {
    organizationsettings
}; 