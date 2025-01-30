const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");
const { activityMiddleware } = require("../../middleware/activity");

const createOrUpdateRotaryAccount = async (req, res) => {
    const user = req.user;
    const { accountnumber, productid, amount, frequency, frequencynumber, autorunnew, userid, member } = req.body;

    // Basic validation
    if (!productid || !amount || !userid || !member) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Missing required fields",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: [
                { field: 'productid', message: 'Product ID is required' },
                { field: 'amount', message: 'Amount is required' },
                { field: 'userid', message: 'User ID is required' },
                { field: 'member', message: 'Member is required' }
            ]
        }); 
    }

    // Check if the productid exists in the rotaryProduct
    const productQuery = `SELECT * FROM divine."rotaryProduct" WHERE id = $1`;
    const productResult = await pg.query(productQuery, [productid]);

    if (productResult.rowCount === 0) {
        await activityMiddleware(req, user.id, 'Product ID not found in rotaryProduct', 'ROTARY_ACCOUNT');
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Product ID not found.",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Product ID not found in rotaryProduct."]
        });
    }

    if (!validateCode(frequency)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid frequency provided.",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Frequency not understood."]
        });
    }

    let thefrequency = frequency;
    let thefrequencynumber = frequencynumber;

    if (productResult.rows[0].rotaryschedule === 'ACCOUNT') {
        thefrequency = frequency;
        thefrequencynumber = frequencynumber;
    } else if (productResult.rows[0].rotaryschedule === 'PRODUCT') {
        thefrequency = productResult.rows[0].frequency;
        thefrequencynumber = productResult.rows[0].frequencynumber;
    }

    try {
        // Fetch the organisation settings
        const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings" LIMIT 1`;
        const orgSettingsResult = await pg.query(orgSettingsQuery);

        if (orgSettingsResult.rowCount === 0) {
            await activityMiddleware(req, user.id, 'Organisation settings not found', 'ROTARY_ACCOUNT');
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Organisation settings not found.",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["Organisation settings not found."]
            });
        }

        const orgSettings = orgSettingsResult.rows[0];
        const accountNumberPrefix = orgSettings.rotary_account_prefix;

        if (!accountNumberPrefix) {
            await activityMiddleware(req, user.id, 'Account number prefix not found in organisation settings', 'ROTARY_ACCOUNT');
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Rotary account prefix not set in organisation settings.",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["Rotary account prefix not set in organisation settings."]
            });
        }

        let generatedAccountNumber = accountnumber;

        if (!accountnumber) {
            // Fetch the highest account number with the given prefix
            const accountRowsQuery = `SELECT accountnumber FROM divine."rotaryaccount" WHERE accountnumber::text LIKE $1 ORDER BY accountnumber DESC LIMIT 1`;
            const { rows: accountRows } = await pg.query(accountRowsQuery, [`${accountNumberPrefix}%`]);

            if (accountRows.length === 0) {
                // Generate the first account number with the given prefix
                generatedAccountNumber = `${accountNumberPrefix}${'0'.repeat(10 - accountNumberPrefix.toString().length - 1)}1`;
            } else {
                // Generate the next account number
                const highestAccountNumber = accountRows[0].accountnumber;
                const newAccountNumber = parseInt(highestAccountNumber) + 1;
                const newAccountNumberStr = newAccountNumber.toString();

                if (newAccountNumberStr.startsWith(accountNumberPrefix)) {
                    generatedAccountNumber = newAccountNumberStr.padStart(10, '0');
                } else {
                    await activityMiddleware(req, user.id, `More accounts cannot be opened with the prefix ${accountNumberPrefix}. Please update the prefix to start a new account run.`, 'ROTARY_ACCOUNT');
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        status: false,
                        message: `More accounts cannot be opened with the prefix ${accountNumberPrefix}. Please update the prefix to start a new account run.`,
                        statuscode: StatusCodes.BAD_REQUEST,
                        data: null,
                        errors: []
                    });
                }
            }
        }

        let query;
        if (accountnumber) {
            // Update existing rotary account
            query = {
                text: `UPDATE divine."rotaryaccount" 
                       SET productid = $1, amount = $2, frequency = $3, frequencynumber = $4, autorunnew = $5, userid = $6, member = $7, dateupdated = NOW() 
                       WHERE accountnumber = $8 RETURNING *`,
                values: [productid, amount, frequency, frequencynumber, autorunnew, userid, member, accountnumber]
            };
        } else {
            // Insert new rotary account
            query = {
                text: `INSERT INTO divine."rotaryaccount" 
                       (accountnumber, productid, amount, frequency, frequencynumber, autorunnew, userid, member, dateadded, status) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'ACTIVE') RETURNING *`,
                values: [generatedAccountNumber, productid, amount, frequency, frequencynumber, autorunnew, userid, member]
            };
        }

        const { rows: [account] } = await pg.query(query);

        // Check the rotaryschedule table for existing schedules with the generated account number
        const scheduleQuery = {
            text: `SELECT * FROM divine."rotaryschedule" WHERE accountnumber = $1 AND currentschedule = true`,
            values: [generatedAccountNumber]
        };
        const { rows: existingSchedules } = await pg.query(scheduleQuery);

        if (existingSchedules.length > 0) {
            // Current schedule exists, update the amount
            const updateScheduleQuery = {
                text: `UPDATE divine."rotaryschedule" 
                       SET amount = $1 
                       WHERE accountnumber = $2 AND currentschedule = true`,
                values: [amount, generatedAccountNumber]
            };
            await pg.query(updateScheduleQuery);
        } else {
            // No current schedule exists, generate new dates
            const nextDates = generateNextDates(thefrequency, thefrequencynumber);

            // Insert new schedules into the rotaryschedule table
            for (const date of nextDates) {
                const insertScheduleQuery = {
                    text: `INSERT INTO divine."rotaryschedule" 
                           (accountnumber, amount, duedate, dateadded, currentschedule, status, createdby) 
                           VALUES ($1, $2, $3, NOW(), true, 'ACTIVE', $4)`,
                    values: [generatedAccountNumber, amount, date, user.id]
                };
                await pg.query(insertScheduleQuery);
            }
        }

        // Log the activity
        const action = accountnumber ? 'updated' : 'created';
        await activityMiddleware(req, user.id, `Rotary account ${action} successfully`, 'ROTARY_ACCOUNT');

        return res.status(accountnumber ? StatusCodes.OK : StatusCodes.CREATED).json({
            status: true,
            message: `Rotary account ${action} successfully`,
            statuscode: accountnumber ? StatusCodes.OK : StatusCodes.CREATED,
            data: account,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred processing rotary account', 'ROTARY_ACCOUNT_ERROR');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { createOrUpdateRotaryAccount };