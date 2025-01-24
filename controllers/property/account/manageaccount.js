const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const createPropertyAccount = async (req, res) => {
    let { accountnumber, productid, userid, registrationcharge, registrationdate, registrationpoint, accountofficer, rowsize, repaymentfrequency, numberofrepayments, percentagedelivery } = req.body;

    try {
        // Check if product exists
        const productQuery = {
            text: `SELECT * FROM divine."propertyproduct" WHERE id = $1`,
            values: [productid]
        };
        const { rows: productRows } = await pg.query(productQuery);
        if (productRows.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Product does not exist",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Check user's existing accounts for the product
        const userAccountQuery = {
            text: `SELECT COUNT(*) FROM divine."propertyaccount" WHERE userid = $1 AND productid = $2 AND status = 'ACTIVE'`,
            values: [userid, productid]
        };
        const { rows: userAccountRows } = await pg.query(userAccountQuery);
        const userAccountCount = parseInt(userAccountRows[0].count, 10);

        // Check if the user has reached the maximum number of accounts for the product
        const productUserAccountLimit = productRows[0].useraccount;
        if (userAccountCount >= productUserAccountLimit) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Maximum number of accounts for this product reached",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Check if registration point exists
        const registrationPointQuery = {
            text: `SELECT * FROM divine."Registrationpoint" WHERE id = $1`,
            values: [registrationpoint]
        };
        const { rows: registrationPointRows } = await pg.query(registrationPointQuery);
        if (registrationPointRows.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Registration point does not exist",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Check if account officer is not a member
        const accountOfficerQuery = {
            text: `SELECT * FROM divine."User" WHERE id = $1 AND role != 'member'`,
            values: [accountofficer]
        };
        const { rows: accountOfficerRows } = await pg.query(accountOfficerQuery);
        if (accountOfficerRows.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Account officer is not valid",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        if(repaymentfrequency){
            if(!validateCode(repaymentfrequency)){
                return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Invalid repayment frequency",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
            }
        }else{
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Repayment frequency is required",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        pg.client('BEGIN')

        if (accountnumber) {
            // If accountnumber is provided, update the existing property account
            const updateAccountQuery = {
                text: `UPDATE divine."propertyaccount" SET productid = $1, registrationcharge = $2, registrationdate = $3, registrationpoint = $4, accountofficer = $5, createdby = $6, repaymentfrequency = $7, numberofrepayments = $8, percentagedelivery = $9, status = 'ACTIVE', dateadded = NOW() WHERE accountnumber = $10 RETURNING id`,
                values: [productid, registrationcharge, registrationdate, registrationpoint, accountofficer, userid, repaymentfrequency, numberofrepayments, percentagedelivery, accountnumber]
            };
            const { rows: updatedAccountRows } = await pg.query(updateAccountQuery);
            if (updatedAccountRows.length === 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Account number does not exist",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
            const propertyAccountId = updatedAccountRows[0].id;

            // Delete existing items associated with the accountnumber
            const deleteItemsQuery = {
                text: `DELETE FROM divine."propertyitems" WHERE accountnumber = $1`,
                values: [accountnumber]
            };
            await pg.query(deleteItemsQuery);

            // Save items to propertyitems table
            for (let i = 0; i < rowsize; i++) {
                const itemid = req.body[`itemid${i+1}`];
                const qty = req.body[`qty${i+1}`];
                if (!itemid || !qty) {
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        status: false,
                        message: `Item ID or quantity missing for item ${i+1}`,
                        statuscode: StatusCodes.BAD_REQUEST,
                        data: null,
                        errors: []
                    });
                }
                const propertyItemsQuery = {
                    text: `INSERT INTO divine."propertyitems" (accountnumber, itemid, qty, price, userid, createdby, status, dateadded) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())`,
                    values: [accountnumber, itemid, qty, 0, userid, userid] // Assuming price is 0 as it's not provided
                };
                await pg.query(propertyItemsQuery);
            }

            await activityMiddleware(req, userid, 'Property account updated successfully', 'PROPERTY_ACCOUNT');

            pg.client('COMMIT')
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Property account updated successfully",
                statuscode: StatusCodes.OK,
                data: { accountnumber, propertyAccountId },
                errors: []
            });
        } else {
            // Generate a 10-digit account number
            const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings" LIMIT 1`;
            const orgSettingsResult = await pg.query(orgSettingsQuery);

            if (orgSettingsResult.rowCount === 0) {
                await activityMiddleware(req, userid, 'Organisation settings not found', 'PROPERTY_ACCOUNT');
                throw new Error('Organisation settings not found.');
            }

            const orgSettings = orgSettingsResult.rows[0];
            const accountNumberPrefix = orgSettings.property_account_prefix;

            if (!accountNumberPrefix) {
                await activityMiddleware(req, userid, 'Account number prefix not found in organisation settings', 'PROPERTY_ACCOUNT');
                throw new Error('Property account prefix not set in organisation settings.');
            }

            const accountRowsQuery = `SELECT accountnumber FROM divine."propertyaccount" WHERE accountnumber::text LIKE $1 ORDER BY accountnumber DESC LIMIT 1`;
            const { rows: accountRows } = await pg.query(accountRowsQuery, [`${accountNumberPrefix}%`]);

            if (accountRows.length === 0) {
                accountnumber = `${accountNumberPrefix}${'0'.repeat(10 - accountNumberPrefix.toString().length - 1)}1`;
            } else {
                const highestAccountNumber = accountRows[0].accountnumber;
                const newAccountNumber = parseInt(highestAccountNumber) + 1;
                const newAccountNumberStr = newAccountNumber.toString();

                if (newAccountNumberStr.startsWith(accountNumberPrefix)) {
                    accountnumber = newAccountNumberStr.padStart(10, '0');
                } else {
                    await activityMiddleware(req, userid, `More accounts cannot be opened with the prefix ${accountNumberPrefix}. Please update the prefix to start a new account run.`, 'PROPERTY_ACCOUNT');
                    throw new Error(`More accounts cannot be opened with the prefix ${accountNumberPrefix}. Please update the prefix to start a new account run.`);
                }
            }

            // Save to propertyaccount table
            const propertyAccountQuery = {
                text: `INSERT INTO divine."propertyaccount" (productid, accountnumber, userid, registrationcharge, registrationdate, registrationpoint, accountofficer, createdby, repaymentfrequency, numberofrepayments, percentagedelivery, status, dateadded) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE', NOW()) RETURNING id`,
                values: [productid, accountnumber, userid, registrationcharge, registrationdate, registrationpoint, accountofficer, userid, repaymentfrequency, numberofrepayments, percentagedelivery]
            };
            const { rows: propertyAccountRows } = await pg.query(propertyAccountQuery);
            const propertyAccountId = propertyAccountRows[0].id;

            // Save items to propertyitems table
            for (let i = 0; i < rowsize; i++) {
                const itemid = req.body[`itemid${i+1}`];
                const qty = req.body[`qty${i+1}`];
                const propertyItemsQuery = {
                    text: `INSERT INTO divine."propertyitems" (accountnumber, itemid, qty, price, userid, createdby, status, dateadded) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW())`,
                    values: [accountnumber, itemid, qty, 0, userid, userid] // Assuming price is 0 as it's not provided
                };
                await pg.query(propertyItemsQuery);
            }

            await activityMiddleware(req, userid, 'Property account created successfully', 'PROPERTY_ACCOUNT');

            return res.status(StatusCodes.CREATED).json({
                status: true,
                message: "Property account created successfully",
                statuscode: StatusCodes.CREATED,
                data: { accountnumber, propertyAccountId },
                errors: []
            });
        }
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, userid, 'An unexpected error occurred creating property account', 'PROPERTY_ACCOUNT');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

function doScheduler(req, date) {

}

module.exports = { createPropertyAccount };
