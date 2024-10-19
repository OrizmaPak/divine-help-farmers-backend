const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const manageSavingsAccount = async (req, res) => {
    const { savingsproductid, userid, amount=0, branch, registrationpoint, registrationcharge, registrationdesc, bankname1, accountname1, bankname2, accountname2, accountofficer, sms, whatsapp, email, createdby, accountnumber } = req.body;

    try {
        const user = req.user;

        // Check if all required fields are provided
        let missingFields = [];
        if (!savingsproductid) missingFields.push('savingsproductid');
        if (!userid) missingFields.push('userid');
        if (!amount) missingFields.push('amount');
        if (!branch) missingFields.push('branch');
        if (!registrationcharge) missingFields.push('registrationcharge');
        if (!createdby) missingFields.push('createdby');

        if (missingFields.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Missing required fields.",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: [`Missing required fields: ${missingFields.join(', ')}.`]
            });
        }

        // Check if the savings product exists
        const productQuery = `SELECT * FROM divine."savingsproduct" WHERE id = $1`;
        const productResult = await pg.query(productQuery, [savingsproductid]);

        if (productResult.rowCount === 0) {
            await activityMiddleware(req, createdby, 'Attempt to create a savings account with a non-existent product', 'ACCOUNT');
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Savings product does not exist.",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Savings product does not exist."]
            });
        }

        // Check if the account officer exists and is a user
        if (accountofficer) {
            const officerQuery = `SELECT * FROM divine."User" WHERE id = $1`;
            const officerResult = await pg.query(officerQuery, [accountofficer]);

            if (officerResult.rowCount === 0) {
                await activityMiddleware(req, createdby, 'Attempt to assign a non-existent user as account officer', 'ACCOUNT');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Account officer does not exist.",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["Account officer does not exist."]
                });
            }
        }

        // Check if the user already has the savings product
        const existingAccountQuery = `SELECT * FROM divine."savings" WHERE userid = $1 AND savingsproductid = $2`;
        const existingAccountResult = await pg.query(existingAccountQuery, [userid, savingsproductid]);

        if (existingAccountResult.rowCount > 0 && !accountnumber) {
            await activityMiddleware(req, createdby, 'Attempt to create a savings account that already exists', 'ACCOUNT');
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "User already has this savings product.",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["User already has this savings product."]
            });
        }

        // Fetch the organisation settings
        const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings" LIMIT 1`;
        const orgSettingsResult = await pg.query(orgSettingsQuery);

        if (orgSettingsResult.rowCount === 0) {
            await activityMiddleware(req, createdby, 'Organisation settings not found', 'ACCOUNT');
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Organisation settings not found.",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["Organisation settings not found."]
            });
        }

        const orgSettings = orgSettingsResult.rows[0];
        const accountNumberPrefix = orgSettings.initial_member_savings_prefix;

        if (!accountNumberPrefix) {
            await activityMiddleware(req, createdby, 'Account number prefix not found in organisation settings', 'ACCOUNT');
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Initial member savings account prefix not set in organisation settings.",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["Initial member savings account prefix not set in organisation settings."]
            });
        }

        const accountRowsQuery = `SELECT accountnumber FROM divine."savings" WHERE accountnumber::text LIKE $1 ORDER BY accountnumber DESC LIMIT 1`;
        const { rows: accountRows } = await pg.query(accountRowsQuery, [`${accountNumberPrefix}%`]);
        
        let generatedAccountNumber;
        if (accountRows.length === 0) {
            generatedAccountNumber = `${accountNumberPrefix}${'0'.repeat(10 - accountNumberPrefix.toString().length - 1)}1`;
        } else {
            const highestAccountNumber = accountRows[0].accountnumber;
            const newAccountNumber = parseInt(highestAccountNumber) + 1;
            const newAccountNumberStr = newAccountNumber.toString();
            
            if (newAccountNumberStr.startsWith(accountNumberPrefix)) {
                generatedAccountNumber = newAccountNumberStr.padStart(10, '0');
            } else {
                await activityMiddleware(req, createdby, `More accounts cannot be opened with the prefix ${accountNumberPrefix}. Please update the prefix to start a new account run.`, 'ACCOUNT');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: `More accounts cannot be opened with the prefix ${accountNumberPrefix}. Please update the prefix to start a new account run.`,
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        }

        if (accountnumber) {
            // Check if the account number already exists
            const accountNumberExistsQuery = `SELECT * FROM divine."savings" WHERE accountnumber = $1`;
            const accountNumberExistsResult = await pg.query(accountNumberExistsQuery, [accountnumber]);

            if (accountNumberExistsResult.rowCount > 0) {
                await activityMiddleware(req, createdby, 'Attempt to update a savings account with an existing account number', 'ACCOUNT');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Account number already exists.",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["Account number already exists."]
                });
            }

            // Check if the branch exists in the branch table if branch is sent
            if (branch) {
                const branchExistsQuery = `SELECT * FROM divine."Branch" WHERE id = $1`;
                const branchExistsResult = await pg.query(branchExistsQuery, [branch]);

                if (branchExistsResult.rowCount === 0) {
                    await activityMiddleware(req, createdby, 'Attempt to update a savings account with a non-existent branch', 'ACCOUNT');
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        status: false,
                        message: "Branch does not exist.",
                        statuscode: StatusCodes.BAD_REQUEST,
                        data: null,
                        errors: ["Branch does not exist."]
                    });
                }
            }

            // Update existing savings account
            const updateAccountQuery = `
                UPDATE divine."savings"
                SET branch = COALESCE($1, branch), 
                    amount = COALESCE($2, amount), 
                    registrationpoint = COALESCE($3, registrationpoint), 
                    registrationcharge = COALESCE($4, registrationcharge), 
                    registrationdesc = COALESCE($5, registrationdesc), 
                    bankname1 = COALESCE($6, bankname1), 
                    accountname1 = COALESCE($7, accountname1), 
                    bankname2 = COALESCE($8, bankname2), 
                    accountname2 = COALESCE($9, accountname2), 
                    accountofficer = COALESCE($10, accountofficer), 
                    sms = COALESCE($11, sms), 
                    whatsapp = COALESCE($12, whatsapp), 
                    email = COALESCE($13, email), 
                    status = COALESCE($14, 'ACTIVE'), 
                WHERE accountnumber = $15
                RETURNING id
            `;
            const updateAccountResult = await pg.query(updateAccountQuery, [branch, amount, registrationpoint, registrationcharge, registrationdesc, bankname1, accountname1, bankname2, accountname2, accountofficer, sms, whatsapp, email, createdby, accountnumber]);

            const updatedAccountId = updateAccountResult.rows[0].id;

            // Record the activity
            await activityMiddleware(req, createdby, `Savings account updated with ID: ${updatedAccountId}`, 'ACCOUNT');

            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Savings account updated successfully.",
                statuscode: StatusCodes.OK,
                data: { id: updatedAccountId },
                errors: []
            });
        } else {
            // Check if the userid exists in the user table
            const userExistsQuery = `SELECT * FROM divine."User" WHERE id = $1`;
            const userExistsResult = await pg.query(userExistsQuery, [userid]);

            if (userExistsResult.rowCount === 0) {
                await activityMiddleware(req, createdby, 'Attempt to create a savings account for a non-existent user', 'ACCOUNT');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "User does not exist.",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["User does not exist."]
                });
            }

            // Check if the branch exists in the branch table
            const branchExistsQuery = `SELECT * FROM divine."Branch" WHERE id = $1`;
            const branchExistsResult = await pg.query(branchExistsQuery, [branch]);

            if (branchExistsResult.rowCount === 0) {
                await activityMiddleware(req, createdby, 'Attempt to create a savings account with a non-existent branch', 'ACCOUNT');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Branch does not exist.",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["Branch does not exist."]
                });
            }
            // Save the new savings account
            const insertAccountQuery = `
                INSERT INTO divine."savings" (savingsproductid, accountnumber, userid, amount, branch, registrationpoint, registrationcharge, registrationdate, registrationdesc, bankname1, accountname1, bankname2, accountname2, accountofficer, sms, whatsapp, email, status, dateadded, createdby)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12, $13, $14, $15, $16, 'ACTIVE', NOW(), $17)
                RETURNING id, accountnumber
            `;
            const insertAccountResult = await pg.query(insertAccountQuery, [savingsproductid, generatedAccountNumber, userid, amount, branch, registrationpoint, registrationcharge, registrationdesc, bankname1, accountname1, bankname2, accountname2, accountofficer, sms, whatsapp, email, user.id]);

            const newAccountId = insertAccountResult.rows[0].id;
            const newAccountNumber = insertAccountResult.rows[0].accountnumber;

            // Record the activity
            await activityMiddleware(req, createdby, `Savings account created with ID: ${newAccountId}`, 'ACCOUNT');

            return res.status(StatusCodes.CREATED).json({
                status: true,
                message: "Savings account created successfully.",
                statuscode: StatusCodes.CREATED,
                data: { id: newAccountId, accountnumber: newAccountNumber },
                errors: []
            });
        }
    } catch (error) {
        console.error(error);
        await activityMiddleware(req, createdby, 'An unexpected error occurred while creating or updating the savings account', 'ACCOUNT');
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal Server Error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: ["An unexpected error occurred while creating or updating the savings account."]
        });
    }
};

module.exports = {
    manageSavingsAccount
};
