    // Start of Selection
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
          addition_loan_registration_charge = null, 
          allow_back_dated_transaction = "NO",
          allow_future_transaction = "NO",
          set_accounting_year_end = null,
          personal_account_overdrawn = false, 
          schedule_maintenace_charge = "NO",
          sms_charge_members = "YES",
          minimum_credit_amount = 2000,
          minimum_credit_amount_penalty = 200,
          personal_transaction_prefix = null,
          loan_transaction_prefix = null,
          savings_transaction_prefix = null,
          gl_transaction_prefix = null,
          savings_account_prefix = null,
          personal_account_prefix = "DHF",
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
          default_allocation_account = null,
          // New schemas added to the model
          property_transaction_prefix = null,
          property_account_prefix = null,
          default_property_account = null,
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
    
        // Validate new schemas if they are required
        // if (property_transaction_prefix && typeof property_transaction_prefix !== 'expected_type') {
        //   errors.push({
        //     field: "property_transaction_prefix",
        //     message: "property_transaction_prefix must be of type expected_type",
        //   });
        // }
        // if (property_account_prefix && typeof property_account_prefix !== 'expected_type') {
        //   errors.push({
        //     field: "property_account_prefix",
        //     message: "property_account_prefix must be of type expected_type",
        //   });
        // }
        // if (default_property_account && typeof default_property_account !== 'expected_type') {
        //   errors.push({
        //     field: "default_property_account",
        //     message: "default_property_account must be of type expected_type",
        //   });
        // }
    
        if (errors.length > 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Validation Error",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: errors,
          });
        }
    
        // Check if default accounts exist in the Accounts table
        const defaultAccounts = [
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
          default_allocation_account, 
        ];
    
        for (const account of defaultAccounts) {
          if (account) {
            const { rowCount } = await pg.query(
              `SELECT 1 FROM divine."Accounts" WHERE accountnumber = $1`,
              [account]
            );
            if (rowCount === 0) {
              return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Account with account number ${account} not found`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: [{ field: "default_account", message: `Account with account number ${account} not found` }],
              });
            }
          }
        }
    
        // Fetch all organization settings
        const { rows: orgSettings } = await pg.query(`SELECT * FROM divine."Organisationsettings"`);
    
        if (orgSettings.length === 0) {
          // Insert new organization settings if none found
          const insertQuery = `
            INSERT INTO divine."Organisationsettings" (
              company_name, sms_sender_id, phone, mobile, email, address, logo, sms_charge, maintenace_charge,
              vat_rate_percent, addition_savings_registration_charge, addition_loan_registration_charge, allow_back_dated_transaction, allow_future_transaction,
              set_accounting_year_end, personal_account_overdrawn, schedule_maintenace_charge, sms_charge_members, minimum_credit_amount, minimum_credit_amount_penalty,
              personal_transaction_prefix, loan_transaction_prefix, savings_transaction_prefix, gl_transaction_prefix, savings_account_prefix, personal_account_prefix, 
              loan_account_prefix, asset_account_prefix, cash_account_prefix, current_assets_account_prefix, expense_account_prefix, income_account_prefix,
              equity_retained_earnings_account_prefix, equity_does_not_close_prefix, inventory_account_prefix, other_asset_account_prefix,
              cost_of_sales_account_prefix, fixed_asset_account_prefix, other_current_asset_account_prefix, accounts_payable_account_prefix,
              accounts_receivable_account_prefix, accumulated_depreciation_account_prefix, liabilities_account_prefix, other_current_liabilities_account_prefix,
              long_term_liabilities_account_prefix, equity_account_prefix, default_sms_charge_account, default_asset_account, default_cash_account,
              default_current_assets_account, default_expense_account, default_income_account, default_equity_retained_earnings_account,
              default_equity_does_not_close_account, default_inventory_account, default_other_asset_account, default_cost_of_sales_account,
              default_fixed_asset_account, default_other_current_asset_account, default_accounts_payable_account, default_accounts_receivable_account,
              default_accumulated_depreciation_account, default_liabilities_account, default_other_current_liabilities_account, default_long_term_liabilities_account,
              default_equity_account, default_tax_account, default_excess_account, default_allocation_account,
              property_transaction_prefix, property_account_prefix, default_property_account
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
              $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
              $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
              $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
              $61, $62, $63, $64, $65, $66, $67, $68, $69,
              $70, $71, $72
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
            parseNumber(addition_loan_registration_charge, null),
            allow_back_dated_transaction || "NO",
            allow_future_transaction || "NO",
            set_accounting_year_end || null,
            personal_account_overdrawn,
            schedule_maintenace_charge || "NO",
            sms_charge_members || "YES",
            parseNumber(minimum_credit_amount, 2000),
            parseNumber(minimum_credit_amount_penalty, 200),
            personal_transaction_prefix || null,
            loan_transaction_prefix || null,
            savings_transaction_prefix || null,
            gl_transaction_prefix || null,
            savings_account_prefix || null,
            personal_account_prefix || "DHF",
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
            parseNumber(default_allocation_account, null),
            property_transaction_prefix || "Default Schema One",
            property_account_prefix || "Default Schema Two",
            default_property_account || "Default Schema Three",
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
              addition_loan_registration_charge = COALESCE($12, addition_loan_registration_charge), 
              allow_back_dated_transaction = COALESCE($13, allow_back_dated_transaction),
              allow_future_transaction = COALESCE($14, allow_future_transaction),
              set_accounting_year_end = COALESCE($15, set_accounting_year_end),
              personal_account_overdrawn = COALESCE($16, personal_account_overdrawn),
              schedule_maintenace_charge = COALESCE($17, schedule_maintenace_charge),
              sms_charge_members = COALESCE($18, sms_charge_members),
              minimum_credit_amount = COALESCE($19, minimum_credit_amount),
              minimum_credit_amount_penalty = COALESCE($20, minimum_credit_amount_penalty),
              personal_transaction_prefix = COALESCE($21, personal_transaction_prefix),
              loan_transaction_prefix = COALESCE($22, loan_transaction_prefix),
              savings_transaction_prefix = COALESCE($23, savings_transaction_prefix),
              gl_transaction_prefix = COALESCE($24, gl_transaction_prefix),
              savings_account_prefix = COALESCE($25, savings_account_prefix),
              personal_account_prefix = COALESCE($26, personal_account_prefix),
              loan_account_prefix = COALESCE($27, loan_account_prefix),
              asset_account_prefix = COALESCE($28, asset_account_prefix),
              cash_account_prefix = COALESCE($29, cash_account_prefix),
              current_assets_account_prefix = COALESCE($30, current_assets_account_prefix),
              expense_account_prefix = COALESCE($31, expense_account_prefix),
              income_account_prefix = COALESCE($32, income_account_prefix),
              equity_retained_earnings_account_prefix = COALESCE($33, equity_retained_earnings_account_prefix),
              equity_does_not_close_prefix = COALESCE($34, equity_does_not_close_prefix),
              inventory_account_prefix = COALESCE($35, inventory_account_prefix),
              other_asset_account_prefix = COALESCE($36, other_asset_account_prefix),
              cost_of_sales_account_prefix = COALESCE($37, cost_of_sales_account_prefix),
              fixed_asset_account_prefix = COALESCE($38, fixed_asset_account_prefix),
              other_current_asset_account_prefix = COALESCE($39, other_current_asset_account_prefix),
              accounts_payable_account_prefix = COALESCE($40, accounts_payable_account_prefix),
              accounts_receivable_account_prefix = COALESCE($41, accounts_receivable_account_prefix),
              accumulated_depreciation_account_prefix = COALESCE($42, accumulated_depreciation_account_prefix),
              liabilities_account_prefix = COALESCE($43, liabilities_account_prefix),
              other_current_liabilities_account_prefix = COALESCE($44, other_current_liabilities_account_prefix),
              long_term_liabilities_account_prefix = COALESCE($45, long_term_liabilities_account_prefix),
              equity_account_prefix = COALESCE($46, equity_account_prefix),
              default_sms_charge_account = COALESCE($47, default_sms_charge_account),
              default_asset_account = COALESCE($48, default_asset_account),
              default_cash_account = COALESCE($49, default_cash_account),
              default_current_assets_account = COALESCE($50, default_current_assets_account),
              default_expense_account = COALESCE($51, default_expense_account),
              default_income_account = COALESCE($52, default_income_account),
              default_equity_retained_earnings_account = COALESCE($53, default_equity_retained_earnings_account),
              default_equity_does_not_close_account = COALESCE($54, default_equity_does_not_close_account),
              default_inventory_account = COALESCE($55, default_inventory_account),
              default_other_asset_account = COALESCE($56, default_other_asset_account),
              default_cost_of_sales_account = COALESCE($57, default_cost_of_sales_account),
              default_fixed_asset_account = COALESCE($58, default_fixed_asset_account),
              default_other_current_asset_account = COALESCE($59, default_other_current_asset_account),
              default_accounts_payable_account = COALESCE($60, default_accounts_payable_account),
              default_accounts_receivable_account = COALESCE($61, default_accounts_receivable_account),
              default_accumulated_depreciation_account = COALESCE($62, default_accumulated_depreciation_account),
              default_liabilities_account = COALESCE($63, default_liabilities_account),
              default_other_current_liabilities_account = COALESCE($64, default_other_current_liabilities_account),
              default_long_term_liabilities_account = COALESCE($65, default_long_term_liabilities_account),
              default_equity_account = COALESCE($66, default_equity_account),
              default_tax_account = COALESCE($67, default_tax_account),
              default_excess_account = COALESCE($68, default_excess_account),
              default_allocation_account = COALESCE($69, default_allocation_account),
              property_transaction_prefix = COALESCE($70, property_transaction_prefix),
              property_account_prefix = COALESCE($71, property_account_prefix),
              default_property_account = COALESCE($72, default_property_account)
            WHERE id = $73
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
            addition_loan_registration_charge,
            allow_back_dated_transaction,
            allow_future_transaction,
            set_accounting_year_end,
            personal_account_overdrawn,
            schedule_maintenace_charge,
            sms_charge_members,
            minimum_credit_amount,
            minimum_credit_amount_penalty,
            personal_transaction_prefix,
            loan_transaction_prefix,
            savings_transaction_prefix,
            gl_transaction_prefix,
            savings_account_prefix,
            personal_account_prefix,
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
            default_allocation_account,
            property_transaction_prefix,
            property_account_prefix,
            default_property_account,
            idToUpdate,
          ];
          // return console.log('started here', updateQuery, updateValues)
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
