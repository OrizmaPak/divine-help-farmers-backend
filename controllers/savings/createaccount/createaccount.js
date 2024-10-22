const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const manageSavingsAccount = async (req, res) => {
    const { savingsproductid, userid, amount = 0, branch, registrationpoint, registrationcharge, registrationdesc, bankname1, bankaccountname1, bankaccountnumber1, bankname2, bankaccountname2, bankaccountnumber2, accountofficer, sms, whatsapp, email, createdby, accountnumber } = req.body;

    try {
        // Type validation based on the model
        let typeErrors = [];

        if (isNaN(parseInt(savingsproductid))) typeErrors.push('savingsproductid must be a number.');
        if (isNaN(parseInt(userid))) typeErrors.push('userid must be a number.');
        if (isNaN(parseInt(amount))) typeErrors.push('amount must be a number.');
        if (isNaN(parseInt(branch))) typeErrors.push('branch must be a number.');
        if (registrationpoint !== undefined && registrationpoint !== '' && isNaN(parseInt(registrationpoint))) typeErrors.push('registrationpoint must be a number.');
        if (isNaN(parseInt(registrationcharge))) typeErrors.push('registrationcharge must be a number.');
        if (registrationdesc !== undefined && registrationdesc !== '' && typeof registrationdesc !== 'string') typeErrors.push('registrationdesc must be a string.');
        if (bankname1 !== undefined && bankname1 !== '' && typeof bankname1 !== 'string') typeErrors.push('bankname1 must be a string.');
        if (bankaccountname1 !== undefined && bankaccountname1 !== '' && typeof bankaccountname1 !== 'string') typeErrors.push('bankaccountname1 must be a string.');
        if (bankaccountnumber1 !== undefined && bankaccountnumber1 !== '' && typeof bankaccountnumber1 !== 'string') typeErrors.push('bankaccountnumber1 must be a string.');
        if (bankname2 !== undefined && bankname2 !== '' && typeof bankname2 !== 'string') typeErrors.push('bankname2 must be a string.');
        if (bankaccountname2 !== undefined && bankaccountname2 !== '' && typeof bankaccountname2 !== 'string') typeErrors.push('bankaccountname2 must be a string.');
        if (bankaccountnumber2 !== undefined && bankaccountnumber2 !== '' && isNaN(parseInt(bankaccountnumber2))) typeErrors.push('bankaccountnumber2 must be a number.');
        if (accountofficer !== undefined && accountofficer !== '' && typeof accountofficer !== 'string') typeErrors.push('accountofficer must be a string.');
        if (sms !== undefined && sms !== '') {
            if (sms.toLowerCase() !== 'true' && sms.toLowerCase() !== 'false') {
                typeErrors.push('sms must be a boolean.');
            }
        }
        if (whatsapp !== undefined && whatsapp !== '') {
            if (whatsapp.toLowerCase() !== 'true' && whatsapp.toLowerCase() !== 'false') {
                typeErrors.push('whatsapp must be a boolean.');
            }
        }
        if (email !== undefined && email !== '') {
            if (email.toLowerCase() !== 'true' && email.toLowerCase() !== 'false') {
                typeErrors.push('email must be a boolean.');
            }
        }
        if (accountnumber !== undefined && accountnumber !== '' && isNaN(parseInt(accountnumber))) typeErrors.push('accountnumber must be a number.');

        // If any type errors are found, return an error response
        if (typeErrors.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Invalid data types.",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: typeErrors
            });
        }

        // Proceed with the existing code for managing the savings account
        const user = req.user;

        // Check if all required fields are provided
        let missingFields = [];
        if (!savingsproductid) missingFields.push('savingsproductid');
        if (!userid) missingFields.push('userid');
        if (!amount) missingFields.push('amount');
        if (!branch) missingFields.push('branch');
        if (!registrationcharge) missingFields.push('registrationcharge');
        // if (!createdby) missingFields.push('createdby');

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
        const accountNumberPrefix = orgSettings.savings_account_prefix;

        if (!accountNumberPrefix) {
            await activityMiddleware(req, createdby, 'Account number prefix not found in organisation settings', 'ACCOUNT');
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Savings account prefix not set in organisation settings.",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["Savings account prefix not set in organisation settings."]
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

            if (accountNumberExistsResult.rowCount === 0) {
                await activityMiddleware(req, createdby, 'Attempt to update a savings account with a non-existent account number', 'ACCOUNT');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Account number does not exist.",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["Account number does not exist."]
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
                    bankaccountname1 = COALESCE($7, bankaccountname1), 
                    bankaccountnumber1 = COALESCE($8, bankaccountnumber1), 
                    bankname2 = COALESCE($9, bankname2), 
                    bankaccountname2 = COALESCE($10, bankaccountname2), 
                    bankaccountnumber2 = COALESCE($11, bankaccountnumber2), 
                    accountofficer = COALESCE($12, accountofficer), 
                    sms = COALESCE($13, sms), 
                    whatsapp = COALESCE($14, whatsapp), 
                    email = COALESCE($15, email), 
                    status = COALESCE($16, 'ACTIVE')
                WHERE accountnumber = $17
                RETURNING id
            `;
            const updateAccountResult = await pg.query(updateAccountQuery, [
                branch, amount, registrationpoint, registrationcharge, registrationdesc, bankname1, bankaccountname1, bankaccountnumber1, bankname2, bankaccountname2, bankaccountnumber2, accountofficer, sms, whatsapp, email, 'ACTIVE', accountnumber
            ]);

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
                INSERT INTO divine."savings" 
                (savingsproductid, accountnumber, userid, amount, branch, registrationpoint, registrationcharge, registrationdate, registrationdesc, bankname1, bankaccountname1, bankaccountnumber1, bankname2, bankaccountname2, bankaccountnumber2, accountofficer, sms, whatsapp, email, status, dateadded, createdby)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'ACTIVE', NOW(), $19)
                RETURNING id, accountnumber
            `;
            const insertAccountResult = await pg.query(insertAccountQuery, [
                savingsproductid, generatedAccountNumber, userid, amount, branch, registrationpoint, registrationcharge, registrationdesc, bankname1, bankaccountname1, bankaccountnumber1, bankname2, bankaccountname2, bankaccountnumber2, accountofficer, sms, whatsapp, email, user.id
            ]);

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
