const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { generateNextDates, validateCode } = require("../../../utils/datecode");

const createPropertyAccount = async (req, res) => {
    let { accountnumber, productid, userid, registrationcharge, registrationdate, registrationpoint, accountofficer, rowsize, repaymentfrequency, numberofrepayments, percentagedelivery, membershipid } = req.body;

    try {
        if (accountnumber) {
            const accountCheckQuery = {
                text: `SELECT * FROM divine."propertyaccount" WHERE accountnumber = $1`,
                values: [accountnumber]
            };
            const { rows: accountCheckRows } = await pg.query(accountCheckQuery);
            if (accountCheckRows.length === 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Account number does not exist",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        }
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

        if(!accountnumber){
            // Check user's existing accounts for the product
            const memberAccountQuery = {
                text: `SELECT COUNT(*) FROM divine."propertyaccount" WHERE membershipid = $1 AND productid = $2 AND status = 'ACTIVE'`,
                values: [membershipid, productid]
            };
            const { rows: memberAccountRows } = await pg.query(memberAccountQuery);
            const memberAccountCount = parseInt(memberAccountRows[0].count, 10);

            // Check if the membershipid has reached the maximum number of accounts for the product
            const productMemberAccountLimit = productRows[0].useraccount;
            if (memberAccountCount >= productMemberAccountLimit) {
                return res.status(StatusCodes.BAD_REQUEST).json({  
                    status: false,
                    message: "Maximum number of accounts for this product reached for the membershipid",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
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

        // Check if account officer is not a membershipid
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

        await pg.query('BEGIN');

        if (accountnumber) {
            // If accountnumber is provided, update the existing property account
            const updateAccountQuery = {
                text: `UPDATE divine."propertyaccount" SET productid = $1, registrationcharge = $2, registrationdate = $3, registrationpoint = $4, accountofficer = $5, createdby = $6, repaymentfrequency = $7, numberofrepayments = $8, percentagedelivery = $9, status = 'ACTIVE', dateadded = NOW() WHERE accountnumber = $10 RETURNING id`,
                values: [productid, registrationcharge, registrationdate, registrationpoint, accountofficer, userid, repaymentfrequency, numberofrepayments, percentagedelivery, accountnumber]
            };
            const { rows: updatedAccountRows } = await pg.query(updateAccountQuery);
            if (updatedAccountRows.length === 0) {
                await pg.query('ROLLBACK');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Account number does not exist",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
            const propertyAccountId = updatedAccountRows[0].id;

            const checkDeliveredItemsQuery = {
                text: `SELECT COUNT(*) FROM divine."propertyitems" WHERE accountnumber = $1 AND status = 'ACTIVE' AND delivered = true`,
                values: [accountnumber]
            };
            const { rows: deliveredItemsRows } = await pg.query(checkDeliveredItemsQuery);
            const deliveredItemsCount = parseInt(deliveredItemsRows[0].count, 10);

            if (deliveredItemsCount > 0) {
                await pg.query('ROLLBACK');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Cannot update account. Some items have already been delivered.",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }

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
                    await pg.query('ROLLBACK');
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

            const deleteInstallmentsQuery = {
                text: `DELETE FROM divine."propertyinstallments" WHERE accountnumber = $1 AND status = 'ACTIVE'`,
                values: [accountnumber]
            };
            await pg.query(deleteInstallmentsQuery);

        } else {
            // Generate a 10-digit account number
            const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings" LIMIT 1`;
            const orgSettingsResult = await pg.query(orgSettingsQuery);

            if (orgSettingsResult.rowCount === 0) {
                await activityMiddleware(req, userid, 'Organisation settings not found', 'PROPERTY_ACCOUNT');
                await pg.query('ROLLBACK');
                throw new Error('Organisation settings not found.');
            }

            const orgSettings = orgSettingsResult.rows[0];
            const accountNumberPrefix = orgSettings.property_account_prefix;

            if (!accountNumberPrefix) {
                await activityMiddleware(req, userid, 'Account number prefix not found in organisation settings', 'PROPERTY_ACCOUNT');
                await pg.query('ROLLBACK');
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
                    await pg.query('ROLLBACK');
                    throw new Error(`More accounts cannot be opened with the prefix ${accountNumberPrefix}. Please update the prefix to start a new account run.`);
                }
            }

            // Save to propertyaccount table
            const propertyAccountQuery = {
                text: `INSERT INTO divine."propertyaccount" (productid, accountnumber, userid, membershipid, registrationcharge, registrationdate, registrationpoint, accountofficer, createdby, repaymentfrequency, numberofrepayments, percentagedelivery, status, dateadded) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE', NOW()) RETURNING id`,
                values: [productid, accountnumber, userid, membershipid, registrationcharge, registrationdate, registrationpoint, accountofficer, userid, repaymentfrequency, numberofrepayments, percentagedelivery]
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
        }

        const dates = await generateNextDates(repaymentfrequency, numberofrepayments);
        let totalValue = 0;
        let itemDetails = [];

        // Calculate total value and store item details
        for (let i = 0; i < Number(rowsize); i++) {
            const itemid = req.body[`itemid${i + 1}`];
            const qty = req.body[`qty${i + 1}`];
            const price = req.body[`price${i + 1}`] || 0;

            if (itemid && qty) {
                const itemTotalValue = qty * price;
                totalValue += itemTotalValue;

                itemDetails.push({
                    itemid,
                    qty,
                    price,
                    totalValue: itemTotalValue,
                    percentageThreshold: (itemTotalValue * percentagedelivery) / 100,
                    cumulativePaid: 0,
                    released: false
                });
            }
        }

        // Check category timeline
        const categoryTimelineQuery = {
            text: `SELECT * FROM divine."categorytimeline" WHERE productid = $1`,
            values: [productid]
        };
        const { rows: categoryTimelineRows } = await pg.query(categoryTimelineQuery);

        if (categoryTimelineRows.length > 0) {
            const categoryTimeline = categoryTimelineRows[0];
            const timelineDays = categoryTimeline.days;
            const generatedDays = dates.length;

            if (generatedDays > timelineDays) {
                await pg.query('ROLLBACK');
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: `The category timeline for this product is ${timelineDays} days, but the number of days entered is ${generatedDays} days, which is ${generatedDays - timelineDays} days more.`,
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        }

        // Calculate amount per installment
        const amountPerInstallment = totalValue / dates.length;

        // Save installments and determine which items can be released
        for (let i = 0; i < dates.length; i++) {
            let installmentDescription = ''; 
            let amountRemaining = amountPerInstallment;

            for (let item of itemDetails) {
                if (item.released) continue;

                const amountTowardItem = Math.min(amountRemaining, item.totalValue - item.cumulativePaid);
                item.cumulativePaid += amountTowardItem;
                amountRemaining -= amountTowardItem;

                if (!item.released && item.cumulativePaid >= item.percentageThreshold) {
                    item.released = true;
                    installmentDescription += `Release item with itemid ${item.itemid} to the customer.\n`;
                }

                if (amountRemaining <= 0) break;
            }

            const propertyInstallmentsQuery = {
                text: `INSERT INTO divine."propertyinstallments" (accountnumber, amount, duedate, delivered, userid, description, createdby, status, dateadded) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', NOW())`,
                values: [
                    accountnumber,
                    amountPerInstallment,
                    dates[i],
                    false,
                    userid,
                    installmentDescription.trim(),
                    userid
                ]
            };
            const { rowCount } = await pg.query(propertyInstallmentsQuery);
            if (rowCount === 0) {
                await pg.query('ROLLBACK');
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: false,
                    message: "Failed to save installment",
                    statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                    data: null,
                    errors: []
                });
            }
        }

        await pg.query('COMMIT');
        return res.status(StatusCodes.OK).json({ 
            status: true, 
            message: accountnumber ? "Property account updated successfully" : "Property account created successfully",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });

    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, userid, 'An unexpected error occurred creating property account', 'PROPERTY_ACCOUNT');
        await pg.query('ROLLBACK');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { createPropertyAccount };
