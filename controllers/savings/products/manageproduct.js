const { StatusCodes } = require("http-status-codes"); // Import StatusCodes for HTTP status codes
const pg = require("../../../db/pg"); // Import PostgreSQL pg
const { addOneDay } = require("../../../utils/expiredate"); // Import utility for adding one day to a date
const { divideAndRoundUp } = require("../../../utils/pageCalculator"); // Import utility for pagination calculations
const { activityMiddleware } = require("../../../middleware/activity"); // Import activity middleware
const { validateCode } = require("../../../utils/datecode");

// Function to handle POST request for creating or updating a savings product
const manageSavingsProduct = async (req, res) => {
    const {
        id,
        productname,
        currency,
        maxbalance,
        allowdeposit,
        allowwithdrawal,
        withdrawallimit,
        withdrawalcharges,
        withdrawalchargetype,
        withdrawalchargeinterval,
        depositcharge,
        depositechargetype = "PERCENTAGE",
        withdrawallimittype,
        chargehere = false,
        activationfee,
        minimumaccountbalance,
        allowoverdrawn,
        compulsorydeposit,
        compulsorydeposittype,
        compulsorydepositspillover,
        compulsorydepositfrequency,
        compulsorydepositfrequencyamount,
        compulsorydepositfrequencyskip,
        compulsorydepositpenalty,
        compulsorydepositpenaltytype,
        compulsorydepositpenaltyfrom,
        compulsorydepositpenaltyfallbackfrom,
        compulsorydepositdeficit = false,
        status = "ACTIVE",
        membership = "",
        interestrowsize = 0,
        deductionrowsize = 0,
        ...body
    } = req.body;

    const user = req.user;

    // Currency validation
    const validCurrencies = ["NGN", "USD"];
    if (!validCurrencies.includes(currency)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `Invalid currency: ${currency}. Allowed values: ${validCurrencies.join(", ")}.`,
            errors: ["Invalid currency"]
        });
    }

    // Withdrawal charge type validation
    const validChargeTypes = ["PERCENTAGE", "AMOUNT"];
    if (withdrawalchargetype && !validChargeTypes.includes(withdrawalchargetype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `Invalid 'withdrawalchargetype': ${withdrawalchargetype}. Allowed values: ${validChargeTypes.join(", ")}.`,
            errors: ["Invalid withdrawalchargetype"]
        });
    }

    // Withdrawal charge interval validation
    if (withdrawalchargeinterval && !validateCode(withdrawalchargeinterval)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid 'withdrawalchargeinterval' value.",
            errors: ["Invalid withdrawalchargeinterval"]
        });
    }

    // Withdrawal limit type validation
    if (withdrawallimittype && !validChargeTypes.includes(withdrawallimittype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `Invalid 'withdrawallimittype': ${withdrawallimittype}. Allowed values: ${validChargeTypes.join(", ")}.`,
            errors: ["Invalid withdrawallimittype"]
        });
    }

    // Deposit charge type validation
    if (!validChargeTypes.includes(depositechargetype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `Invalid 'depositechargetype': ${depositechargetype}. Allowed values: ${validChargeTypes.join(", ")}.`,
            errors: ["Invalid depositechargetype"]
        });
    }

    // Compulsory deposit type validation
    const validCompulsoryDepositTypes = ["FIXED", "MINIMUM"];
    if (compulsorydeposittype && !validCompulsoryDepositTypes.includes(compulsorydeposittype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `Invalid 'compulsorydeposittype': ${compulsorydeposittype}. Allowed values: ${validCompulsoryDepositTypes.join(", ")}.`,
            errors: ["Invalid compulsorydeposittype"]
        });
    }

    // Compulsory deposit frequency validation
    if (compulsorydepositfrequency && !validateCode(compulsorydepositfrequency)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid 'compulsorydepositfrequency' value.",
            errors: ["Invalid compulsorydepositfrequency"]
        });
    }

    // Compulsory deposit penalty type validation
    if (compulsorydepositpenaltytype && !validChargeTypes.includes(compulsorydepositpenaltytype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `Invalid 'compulsorydepositpenaltytype': ${compulsorydepositpenaltytype}. Allowed values: ${validChargeTypes.join(", ")}.`,
            errors: ["Invalid compulsorydepositpenaltytype"]
        });
    }

    // Check penalty and deficit consistency
    if ((compulsorydepositdeficit === true || compulsorydepositdeficit === "true") && compulsorydepositpenalty !== 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "The 'compulsorydepositpenalty' must be zero when 'compulsorydepositdeficit' is true.",
            errors: ["Invalid compulsorydepositpenalty"]
        });
    }

    // Ensure compulsory deposit frequency amount is provided if compulsorydeposit is true
    if ((compulsorydeposit === true || compulsorydeposit === "true") && !compulsorydepositfrequencyamount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "The 'compulsorydepositfrequencyamount' is required when 'compulsorydeposit' is true.",
            errors: ["Missing compulsorydepositfrequencyamount"]
        });
    }

    // Membership validation
    if (membership) {
        // Split membership by '|' to handle multiple memberships
        const membershipIds = membership.split('|').map(id => id.trim());

        // Check if all membershipIds are valid numbers
        const invalidIds = membershipIds.filter(id => !/^\d+$/.test(id));
        if (invalidIds.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Invalid membership ID(s): ${invalidIds.join(", ")}. Membership IDs must be numeric.`,
                errors: ["Invalid membership ID format"]
            });
        }

        // Convert to integers
        const numericMembershipIds = membershipIds.map(id => parseInt(id, 10));

        // Query to check existence of all membership IDs
        const queryText = `SELECT id FROM divine."Membership" WHERE id = ANY($1::int[])`;
        const { rows: existingMemberships } = await pg.query(queryText, [numericMembershipIds]);

        const existingIds = existingMemberships.map(row => row.id);
        const nonExistentIds = numericMembershipIds.filter(id => !existingIds.includes(id));

        if (nonExistentIds.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Membership ID(s) not found: ${nonExistentIds.join(", ")}.`,
                errors: ["Invalid membership ID(s)"]
            });
        }
    }

    // Process interests and deductions arrays
    const interests = [];
    const deductions = [];

    // Process interests
    for (let i = 1; i <= interestrowsize; i++) {
        const interest = {
            interestname: body[`interestname${i}`],
            interestmethod: body[`interestmethod${i}`],
            eligibilityaccountage: parseInt(body[`eligibilityaccountage${i}`], 10),
            eligibilitybalance: parseFloat(body[`eligibilitybalance${i}`]),
            interestamount: parseFloat(body[`interestamount${i}`]),
            interesttype: body[`interesttype${i}`],
            interestfrequency: body[`interestfrequency${i}`],
            interestfrequencynumber: parseInt(body[`interestfrequencynumber${i}`] || 0, 10),
            interestfrequencyskip: parseInt(body[`interestfrequencyskip${i}`] || 0, 10),
            goforapproval: body[`goforapproval${i}`] === "true"
        };

        // Validate interesttype
        const validInterestTypes = ["PERCENTAGE", "AMOUNT"];
        if (!validInterestTypes.includes(interest.interesttype)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Invalid 'interesttype': ${interest.interesttype}. Allowed values: ${validInterestTypes.join(", ")}.`,
                errors: ["Invalid interesttype"]
            });
        }

        // Validate interestfrequency
        if (!validateCode(interest.interestfrequency)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Invalid 'interestfrequency' value.",
                errors: ["Invalid interestfrequency"]
            });
        }

        interests.push(interest);
    }

    // Process deductions
    for (let i = 1; i <= deductionrowsize; i++) {
        const deduction = {
            deductionname: body[`deductionname${i}`],
            eligibilityaccountage: parseInt(body[`eligibilityaccountage${i}`], 10),
            eligibilitybalance: parseFloat(body[`eligibilitybalance${i}`]),
            deductionamount: parseFloat(body[`deductionamount${i}`]),
            deductiontype: body[`deductiontype${i}`],
            deductionmethod: body[`deductionmethod${i}`],
            deductionfrequency: body[`deductionfrequency${i}`],
            deductionfrequencynumber: parseInt(body[`deductionfrequencynumber${i}`] || 0, 10),
            deductionfrequencyskip: parseInt(body[`deductionfrequencyskip${i}`] || 0, 10),
            goforapproval: body[`goforapproval${i}`] === "true"
        };

        // Validate deductiontype
        const validDeductionTypes = ["PERCENTAGE", "AMOUNT"];
        if (!validDeductionTypes.includes(deduction.deductiontype)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Invalid 'deductiontype': ${deduction.deductiontype}. Allowed values: ${validDeductionTypes.join(", ")}.`,
                errors: ["Invalid deductiontype"]
            });
        }

        // Validate deductionmethod
        const validDeductionMethods = ["LATEST BALANCE", "PRO RATA BASIS"];
        if (!validDeductionMethods.includes(deduction.deductionmethod)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Invalid 'deductionmethod': ${deduction.deductionmethod}. Allowed values: ${validDeductionMethods.join(", ")}.`,
                errors: ["Invalid deductionmethod"]
            });
        }

        // Validate deductionfrequency
        if (!validateCode(deduction.deductionfrequency)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Invalid 'deductionfrequency' value.",
                errors: ["Invalid deductionfrequency"]
            });
        }

        deductions.push(deduction);
    }

    try {
        await pg.query("BEGIN"); // Start transaction

        if (id) {
            // Update existing product
            const { rows: existingProductById } = await pg.query(`SELECT * FROM divine."savingsproduct" WHERE id = $1`, [id]);
            if (existingProductById.length === 0) {
                await pg.query("ROLLBACK");
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Product with the provided ID does not exist.",
                    errors: ["Nonexistent product"]
                });
            }

            const adjustedCompulsoryDepositPenalty = compulsorydepositdeficit ? 0 : compulsorydepositpenalty;

            await pg.query(
                `UPDATE divine."savingsproduct" SET
                    productname = $1,
                    currency = $2,
                    maxbalance = $3,
                    allowdeposit = $4,
                    allowwithdrawal = $5,
                    withdrawallimit = $6,
                    withdrawalcharges = $7,
                    withdrawalchargetype = $8,
                    withdrawalchargeinterval = $9,
                    depositcharge = $10,
                    depositechargetype = $11,
                    withdrawallimittype = $12,
                    chargehere = $13,
                    activationfee = $14,
                    minimumaccountbalance = $15,
                    allowoverdrawn = $16,
                    compulsorydeposit = $17,
                    compulsorydeposittype = $18,
                    compulsorydepositspillover = $19,
                    compulsorydepositfrequency = $20,
                    compulsorydepositfrequencyamount = $21,
                    compulsorydepositfrequencyskip = $22,
                    compulsorydepositpenalty = $23,
                    compulsorydepositpenaltytype = $24,
                    compulsorydepositpenaltyfrom = $25,
                    compulsorydepositpenaltyfallbackfrom = $26,
                    compulsorydepositdeficit = $27,
                    membership = $28,
                    status = $29,
                    updatedat = NOW()
                WHERE id = $30`,
                [
                    productname,
                    currency,
                    maxbalance,
                    allowdeposit,
                    allowwithdrawal,
                    withdrawallimit,
                    withdrawalcharges,
                    withdrawalchargetype,
                    withdrawalchargeinterval,
                    depositcharge,
                    depositechargetype,
                    withdrawallimittype,
                    chargehere,
                    activationfee,
                    minimumaccountbalance,
                    allowoverdrawn,
                    compulsorydeposit,
                    compulsorydeposittype,
                    compulsorydepositspillover,
                    compulsorydepositfrequency,
                    compulsorydepositfrequencyamount,
                    compulsorydepositfrequencyskip,
                    adjustedCompulsoryDepositPenalty,
                    compulsorydepositpenaltytype,
                    compulsorydepositpenaltyfrom,
                    compulsorydepositpenaltyfallbackfrom,
                    compulsorydepositdeficit,
                    membership,
                    status,
                    id
                ]
            );

            // Delete existing interests and deductions
            await pg.query(`DELETE FROM divine."Interest" WHERE savingsproductid = $1`, [id]);
            await pg.query(`DELETE FROM divine."Deduction" WHERE savingsproductid = $1`, [id]);

            // Insert new interests
            for (const interest of interests) {
                await pg.query(
                    `INSERT INTO divine."Interest" (
                        savingsproductid,
                        interestname,
                        interestmethod,
                        eligibilityaccountage,
                        eligibilitybalance,
                        interestamount,
                        interesttype,
                        interestfrequency,
                        interestfrequencynumber,
                        interestfrequencyskip,
                        goforapproval,
                        status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE')`,
                    [
                        id,
                        interest.interestname,
                        interest.interestmethod,
                        interest.eligibilityaccountage,
                        interest.eligibilitybalance,
                        interest.interestamount,
                        interest.interesttype,
                        interest.interestfrequency,
                        interest.interestfrequencynumber,
                        interest.interestfrequencyskip,
                        interest.goforapproval
                    ]
                );
            }

            // Insert new deductions
            for (const deduction of deductions) {
                await pg.query(
                    `INSERT INTO divine."Deduction" (
                        savingsproductid,
                        deductionname,
                        eligibilityaccountage,
                        eligibilitybalance,
                        deductionamount,
                        deductiontype,
                        deductionmethod,
                        deductionfrequency,
                        deductionfrequencynumber,
                        deductionfrequencyskip,
                        goforapproval,
                        status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE')`,
                    [
                        id,
                        deduction.deductionname,
                        deduction.eligibilityaccountage,
                        deduction.eligibilitybalance,
                        deduction.deductionamount,
                        deduction.deductiontype,
                        deduction.deductionmethod,
                        deduction.deductionfrequency,
                        deduction.deductionfrequencynumber,
                        deduction.deductionfrequencyskip,
                        deduction.goforapproval
                    ]
                );
            }

            await pg.query('COMMIT'); // Commit transaction

            // Record the activity
            await activityMiddleware(res, user.id, `${productname} Product updated`, 'PRODUCT');

            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Product updated successfully",
                statuscode: StatusCodes.OK,
                errors: []
            });
        } else {
            // Create new product
            const { rows: existingProduct } = await pg.query(`SELECT * FROM divine."savingsproduct" WHERE productname = $1`, [productname]);
            if (existingProduct.length > 0) {
                await pg.query("ROLLBACK");
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Product already exists",
                    errors: ["Product already exists"]
                });
            }

            const adjustedCompulsoryDepositPenalty = compulsorydepositdeficit ? 0 : compulsorydepositpenalty;

            const insertProductQuery = `
                INSERT INTO divine."savingsproduct" (
                    productname,
                    currency,
                    maxbalance,
                    allowdeposit,
                    allowwithdrawal,
                    withdrawallimit,
                    withdrawalcharges,
                    withdrawalchargetype,
                    withdrawalchargeinterval,
                    depositcharge,
                    depositechargetype,
                    withdrawallimittype,
                    chargehere,
                    activationfee,
                    minimumaccountbalance,
                    allowoverdrawn,
                    compulsorydeposit,
                    compulsorydeposittype,
                    compulsorydepositspillover,
                    compulsorydepositfrequency,
                    compulsorydepositfrequencyamount,
                    compulsorydepositfrequencyskip,
                    compulsorydepositpenalty,
                    compulsorydepositpenaltytype,
                    compulsorydepositpenaltyfrom,
                    compulsorydepositpenaltyfallbackfrom,
                    compulsorydepositdeficit,
                    membership,
                    status,
                    dateadded
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15,
                    $16, $17, $18, $19, $20,
                    $21, $22, $23, $24, $25,
                    $26, $27, $28, $29, NOW()
                ) RETURNING id`;

            const values = [
                productname,
                currency,
                maxbalance,
                allowdeposit,
                allowwithdrawal,
                withdrawallimit,
                withdrawalcharges,
                withdrawalchargetype,
                withdrawalchargeinterval,
                depositcharge,
                depositechargetype,
                withdrawallimittype,
                chargehere,
                activationfee,
                minimumaccountbalance,
                allowoverdrawn,
                compulsorydeposit,
                compulsorydeposittype,
                compulsorydepositspillover,
                compulsorydepositfrequency,
                compulsorydepositfrequencyamount,
                compulsorydepositfrequencyskip,
                adjustedCompulsoryDepositPenalty,
                compulsorydepositpenaltytype,
                compulsorydepositpenaltyfrom,
                compulsorydepositpenaltyfallbackfrom,
                compulsorydepositdeficit,
                membership,
                status
            ];

            const { rows } = await pg.query(insertProductQuery, values);
            const newId = rows[0].id;

            // Insert interests
            for (const interest of interests) {
                await pg.query(
                    `INSERT INTO divine."Interest" (
                        savingsproductid,
                        interestname,
                        interestmethod,
                        eligibilityaccountage,
                        eligibilitybalance,
                        interestamount,
                        interesttype,
                        interestfrequency,
                        interestfrequencynumber,
                        interestfrequencyskip,
                        goforapproval,
                        status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE')`,
                    [
                        newId,
                        interest.interestname,
                        interest.interestmethod,
                        interest.eligibilityaccountage,
                        interest.eligibilitybalance,
                        interest.interestamount,
                        interest.interesttype,
                        interest.interestfrequency,
                        interest.interestfrequencynumber,
                        interest.interestfrequencyskip,
                        interest.goforapproval
                    ]
                );
            }

            // Insert deductions
            for (const deduction of deductions) {
                await pg.query(
                    `INSERT INTO divine."Deduction" (
                        savingsproductid,
                        deductionname,
                        eligibilityaccountage,
                        eligibilitybalance,
                        deductionamount,
                        deductiontype,
                        deductionmethod,
                        deductionfrequency,
                        deductionfrequencynumber,
                        deductionfrequencyskip,
                        goforapproval,
                        status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE')`,
                    [
                        newId,
                        deduction.deductionname,
                        deduction.eligibilityaccountage,
                        deduction.eligibilitybalance,
                        deduction.deductionamount,
                        deduction.deductiontype,
                        deduction.deductionmethod,
                        deduction.deductionfrequency,
                        deduction.deductionfrequencynumber,
                        deduction.deductionfrequencyskip,
                        deduction.goforapproval
                    ]
                );
            }

            await pg.query('COMMIT'); // Commit transaction

            // Record the activity
            await activityMiddleware(res, user.id, `${productname} Product created`, 'PRODUCT');

            return res.status(StatusCodes.CREATED).json({
                status: true,
                message: "Product created successfully",
                statuscode: StatusCodes.CREATED,
                errors: []
            });
        }
    } catch (error) {
        await pg.query('ROLLBACK'); // Rollback transaction on error
        console.error(error); // Log the error for debugging
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal Server Error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            errors: ["An unexpected error occurred while managing the savings product"]
        });
    }
};

module.exports = {
    manageSavingsProduct
};
