const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { uploadToGoogleDrive } = require("../../../utils/uploadToGoogleDrive");
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware

const organizationsettings = async (req, res) => {
  try {
    // Handle file upload if files are present
    if (req.files) {
      await uploadToGoogleDrive(req, res);
    }
    console.log(req.body);

    // Destructure and set default values from req.body
    const {
      company_name,
      sms_sender_id,
      phone = "",
      mobile = "",
      email,
      address,
      logo,
      sms_charge = null,
      maintenace_charge = null,
      vat_rate_percent = 0,
      addition_savings_registration_charge = null,
      allow_back_dated_transaction = "NO",
      allow_future_transaction = "NO",
      set_accounting_year_end = null,
      schedule_maintenace_charge = "NO",
      sms_charge_members = "YES",
      minimum_credit_amount = 2000,
      minimum_credit_amount_penalty = 200,
      initial_member_savings_prefix = null,
      personal_account_prefix = "DHF",
      loan_transaction_prefix = null,
      member_transaction_prefix = null,
      loan_account_prefix = null,
      asset_account_prefix = null,
      cash_account_prefix = null,
      current_assets_account_prefix = null,
      expense_account_prefix = null,
      income_account_prefix = null,
      equity_retained_earnings_account_prefix = null,
      equity_does_not_close_prefix = null,
      inventory_account_prefix = null,
      other_asset_account_prefix = null,
      cost_of_sales_account_prefix = null,
      fixed_asset_account_prefix = null,
      other_current_asset_account_prefix = null,
      accounts_payable_account_prefix = null,
      accounts_receivable_account_prefix = null,
      accumulated_depreciation_account_prefix = null,
      liabilities_account_prefix = null,
      other_current_liabilities_account_prefix = null,
      long_term_liabilities_account_prefix = null,
      equity_account_prefix = null,
      default_sms_charge_account = null,
      default_asset_account = null,
      default_cash_account = null,
      default_current_assets_account = null,
      default_expense_account = null,
      default_income_account = null,
      default_equity_retained_earnings_account = null,
      default_equity_does_not_close_account = null,
      default_inventory_account = null,
      default_other_asset_account = null,
      default_cost_of_sales_account = null,
      default_fixed_asset_account = null,
      default_other_current_asset_account = null,
      default_accounts_payable_account = null,
      default_accounts_receivable_account = null,
      default_accumulated_depreciation_account = null,
      default_liabilities_account = null,
      default_other_current_liabilities_account = null,
      default_long_term_liabilities_account = null,
      default_equity_account = null,
      default_tax_account = null,
      default_excess_account = null,
    } = req.body;

    const user = req.user;

    // Basic validation
    const errors = [];

    if (!company_name) {
      errors.push({
        field: "company_name",
        message: "Company name is required",
      });
    }
    if (!sms_sender_id) {
      errors.push({
        field: "sms_sender_id",
        message: "SMS sender ID is required",
      });
    }
    if (!phone) {
      errors.push({
        field: "phone",
        message: "Phone number is required",
      });
    }
    if (!mobile) {
      errors.push({
        field: "mobile",
        message: "Mobile number is required",
      });
    }
    if (!email) {
      errors.push({
        field: "email",
        message: "Email is required",
      });
    }
    if (!address) {
      errors.push({
        field: "address",
        message: "Address is required",
      });
    }

    if (errors.length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: false,
        message: "Validation Error",
        statuscode: StatusCodes.BAD_REQUEST,
        data: null,
        errors: errors,
      });
    }

    // Fetch all organization settings
    const { rows: orgSettings } = await pg.query(`SELECT * FROM divine."Organisationsettings"`);

    if (orgSettings.length === 0) {
      // Insert new organization settings if none found
      const insertQuery = `
        INSERT INTO divine."Organisationsettings" (
          company_name, sms_sender_id, phone, mobile, email, address, logo, sms_charge, maintenace_charge,
          vat_rate_percent, addition_savings_registration_charge, allow_back_dated_transaction, allow_future_transaction,
          set_accounting_year_end, schedule_maintenace_charge, sms_charge_members, minimum_credit_amount, minimum_credit_amount_penalty,
          initial_member_savings_prefix, personal_account_prefix, loan_transaction_prefix, member_transaction_prefix, loan_account_prefix,
          asset_account_prefix, cash_account_prefix, current_assets_account_prefix, expense_account_prefix, income_account_prefix,
          equity_retained_earnings_account_prefix, equity_does_not_close_prefix, inventory_account_prefix, other_asset_account_prefix,
          cost_of_sales_account_prefix, fixed_asset_account_prefix, other_current_asset_account_prefix, accounts_payable_account_prefix,
          accounts_receivable_account_prefix, accumulated_depreciation_account_prefix, liabilities_account_prefix, other_current_liabilities_account_prefix,
          long_term_liabilities_account_prefix, equity_account_prefix, default_sms_charge_account, default_asset_account, default_cash_account,
          default_current_assets_account, default_expense_account, default_income_account, default_equity_retained_earnings_account,
          default_equity_does_not_close_account, default_inventory_account, default_other_asset_account, default_cost_of_sales_account,
          default_fixed_asset_account, default_other_current_asset_account, default_accounts_payable_account, default_accounts_receivable_account,
          default_accumulated_depreciation_account, default_liabilities_account, default_other_current_liabilities_account, default_long_term_liabilities_account,
          default_equity_account, default_tax_account, default_excess_account
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
          $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
          $61, $62
        ) RETURNING id
      `;

      const insertValues = [
        company_name || "Default Company Name",
        sms_sender_id || "Default SMS Sender ID",
        phone || "",
        mobile || "",
        email || "default@example.com",
        address || "Default Address",
        logo || "default_logo.png",
        parseNumber(sms_charge, null),
        parseNumber(maintenace_charge, null),
        parseNumber(vat_rate_percent, 0),
        parseNumber(addition_savings_registration_charge, null),
        allow_back_dated_transaction || "NO",
        allow_future_transaction || "NO",
        set_accounting_year_end || null,
        schedule_maintenace_charge || "NO",
        sms_charge_members || "YES",
        parseNumber(minimum_credit_amount, 2000),
        parseNumber(minimum_credit_amount_penalty, 200),
        initial_member_savings_prefix || null,
        personal_account_prefix || "DHF",
        loan_transaction_prefix || null,
        member_transaction_prefix || null,
        loan_account_prefix || null,
        asset_account_prefix || null,
        cash_account_prefix || null,
        current_assets_account_prefix || null,
        expense_account_prefix || null,
        income_account_prefix || null,
        equity_retained_earnings_account_prefix || null,
        equity_does_not_close_prefix || null,
        inventory_account_prefix || null,
        other_asset_account_prefix || null,
        cost_of_sales_account_prefix || null,
        fixed_asset_account_prefix || null,
        other_current_asset_account_prefix || null,
        accounts_payable_account_prefix || null,
        accounts_receivable_account_prefix || null,
        accumulated_depreciation_account_prefix || null,
        liabilities_account_prefix || null,
        other_current_liabilities_account_prefix || null,
        long_term_liabilities_account_prefix || null,
        equity_account_prefix || null,
        parseNumber(default_sms_charge_account, null),
        parseNumber(default_asset_account, null),
        parseNumber(default_cash_account, null),
        parseNumber(default_current_assets_account, null),
        parseNumber(default_expense_account, null),
        parseNumber(default_income_account, null),
        parseNumber(default_equity_retained_earnings_account, null),
        parseNumber(default_equity_does_not_close_account, null),
        parseNumber(default_inventory_account, null),
        parseNumber(default_other_asset_account, null),
        parseNumber(default_cost_of_sales_account, null),
        parseNumber(default_fixed_asset_account, null),
        parseNumber(default_other_current_asset_account, null),
        parseNumber(default_accounts_payable_account, null),
        parseNumber(default_accounts_receivable_account, null),
        parseNumber(default_accumulated_depreciation_account, null),
        parseNumber(default_liabilities_account, null),
        parseNumber(default_other_current_liabilities_account, null),
        parseNumber(default_long_term_liabilities_account, null),
        parseNumber(default_equity_account, null),
        parseNumber(default_tax_account, null),
        parseNumber(default_excess_account, null),
      ];

      const { rows } = await pg.query(insertQuery, insertValues);

      const newId = rows[0].id;

      // RECORD THE ACTIVITY
      await activityMiddleware(
        res,
        user.id,
        `${company_name} Organization Settings created`,
        "ORGANIZATION_SETTINGS"
      );

      return res.status(StatusCodes.OK).json({
        status: true,
        message: `${company_name} successfully created`,
        statuscode: StatusCodes.OK,
        data: { id: newId },
        errors: [],
      });
    } else {
      // If multiple settings exist, log a warning and proceed to update the most recent one
      if (orgSettings.length > 1) {
        console.warn(
          "Multiple organization settings found. Updating the most recent one."
        );
      }

      // Determine the id to update (the one with the highest id)
      const idToUpdate = Math.max(...orgSettings.map((setting) => setting.id));

      // Update the organization settings
      const updateQuery = `
        UPDATE divine."Organisationsettings" SET 
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
          minimum_credit_amount = COALESCE($17, minimum_credit_amount),
          minimum_credit_amount_penalty = COALESCE($18, minimum_credit_amount_penalty),
          initial_member_savings_prefix = COALESCE($19, initial_member_savings_prefix),
          personal_account_prefix = COALESCE($20, personal_account_prefix),
          loan_transaction_prefix = COALESCE($21, loan_transaction_prefix),
          member_transaction_prefix = COALESCE($22, member_transaction_prefix),
          loan_account_prefix = COALESCE($23, loan_account_prefix),
          asset_account_prefix = COALESCE($24, asset_account_prefix),
          cash_account_prefix = COALESCE($25, cash_account_prefix),
          current_assets_account_prefix = COALESCE($26, current_assets_account_prefix),
          expense_account_prefix = COALESCE($27, expense_account_prefix),
          income_account_prefix = COALESCE($28, income_account_prefix),
          equity_retained_earnings_account_prefix = COALESCE($29, equity_retained_earnings_account_prefix),
          equity_does_not_close_prefix = COALESCE($30, equity_does_not_close_prefix),
          inventory_account_prefix = COALESCE($31, inventory_account_prefix),
          other_asset_account_prefix = COALESCE($32, other_asset_account_prefix),
          cost_of_sales_account_prefix = COALESCE($33, cost_of_sales_account_prefix),
          fixed_asset_account_prefix = COALESCE($34, fixed_asset_account_prefix),
          other_current_asset_account_prefix = COALESCE($35, other_current_asset_account_prefix),
          accounts_payable_account_prefix = COALESCE($36, accounts_payable_account_prefix),
          accounts_receivable_account_prefix = COALESCE($37, accounts_receivable_account_prefix),
          accumulated_depreciation_account_prefix = COALESCE($38, accumulated_depreciation_account_prefix),
          liabilities_account_prefix = COALESCE($39, liabilities_account_prefix),
          other_current_liabilities_account_prefix = COALESCE($40, other_current_liabilities_account_prefix),
          long_term_liabilities_account_prefix = COALESCE($41, long_term_liabilities_account_prefix),
          equity_account_prefix = COALESCE($42, equity_account_prefix),
          default_sms_charge_account = COALESCE($43, default_sms_charge_account),
          default_asset_account = COALESCE($44, default_asset_account),
          default_cash_account = COALESCE($45, default_cash_account),
          default_current_assets_account = COALESCE($46, default_current_assets_account),
          default_expense_account = COALESCE($47, default_expense_account),
          default_income_account = COALESCE($48, default_income_account),
          default_equity_retained_earnings_account = COALESCE($49, default_equity_retained_earnings_account),
          default_equity_does_not_close_account = COALESCE($50, default_equity_does_not_close_account),
          default_inventory_account = COALESCE($51, default_inventory_account),
          default_other_asset_account = COALESCE($52, default_other_asset_account),
          default_cost_of_sales_account = COALESCE($53, default_cost_of_sales_account),
          default_fixed_asset_account = COALESCE($54, default_fixed_asset_account),
          default_other_current_asset_account = COALESCE($55, default_other_current_asset_account),
          default_accounts_payable_account = COALESCE($56, default_accounts_payable_account),
          default_accounts_receivable_account = COALESCE($57, default_accounts_receivable_account),
          default_accumulated_depreciation_account = COALESCE($58, default_accumulated_depreciation_account),
          default_liabilities_account = COALESCE($59, default_liabilities_account),
          default_other_current_liabilities_account = COALESCE($60, default_other_current_liabilities_account),
          default_long_term_liabilities_account = COALESCE($61, default_long_term_liabilities_account),
          default_equity_account = COALESCE($62, default_equity_account),
          default_tax_account = COALESCE($63, default_tax_account),
          default_excess_account = COALESCE($64, default_excess_account)
        WHERE id = $65
      `;

      const updateValues = [
        company_name,
        sms_sender_id,
        phone,
        mobile,
        email,
        address,
        logo,
        sms_charge,
        maintenace_charge,
        vat_rate_percent,
        addition_savings_registration_charge,
        allow_back_dated_transaction,
        allow_future_transaction,
        set_accounting_year_end,
        schedule_maintenace_charge,
        sms_charge_members,
        minimum_credit_amount,
        minimum_credit_amount_penalty,
        initial_member_savings_prefix,
        personal_account_prefix,
        loan_transaction_prefix,
        member_transaction_prefix,
        loan_account_prefix,
        asset_account_prefix,
        cash_account_prefix,
        current_assets_account_prefix,
        expense_account_prefix,
        income_account_prefix,
        equity_retained_earnings_account_prefix,
        equity_does_not_close_prefix,
        inventory_account_prefix,
        other_asset_account_prefix,
        cost_of_sales_account_prefix,
        fixed_asset_account_prefix,
        other_current_asset_account_prefix,
        accounts_payable_account_prefix,
        accounts_receivable_account_prefix,
        accumulated_depreciation_account_prefix,
        liabilities_account_prefix,
        other_current_liabilities_account_prefix,
        long_term_liabilities_account_prefix,
        equity_account_prefix,
        default_sms_charge_account,
        default_asset_account,
        default_cash_account,
        default_current_assets_account,
        default_expense_account,
        default_income_account,
        default_equity_retained_earnings_account,
        default_equity_does_not_close_account,
        default_inventory_account,
        default_other_asset_account,
        default_cost_of_sales_account,
        default_fixed_asset_account,
        default_other_current_asset_account,
        default_accounts_payable_account,
        default_accounts_receivable_account,
        default_accumulated_depreciation_account,
        default_liabilities_account,
        default_other_current_liabilities_account,
        default_long_term_liabilities_account,
        default_equity_account,
        default_tax_account,
        default_excess_account,
        idToUpdate,
      ];

      await pg.query(updateQuery, updateValues);

      // RECORD THE ACTIVITY
      await activityMiddleware(
        res,
        user.id,
        `${company_name} Organization Settings updated`,
        "ORGANIZATION_SETTINGS"
      );

      return res.status(StatusCodes.OK).json({
        status: true,
        message: `${company_name} successfully updated`,
        statuscode: StatusCodes.OK,
        data: { id: idToUpdate },
        errors: [],
      });
    }
  } catch (err) {
    console.error("Unexpected Error:", err);

    // Provide detailed error message in development mode
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? err.message
        : "An unexpected error occurred";

    // Collect detailed error information
    const errorDetails =
      process.env.NODE_ENV === "development"
        ? [{ message: err.message, stack: err.stack }]
        : [];

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: errorMessage,
      statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
      data: null,
      errors: errorDetails,
    });
  }
};

function parseNumber(value, defaultValue = 0) {
    const number = parseFloat(value);
    return isNaN(number) ? defaultValue : number;
  }

module.exports = {
  organizationsettings,
};
