const { StatusCodes } = require("http-status-codes"); // Import StatusCodes for HTTP status codes
const pg = require("../../../db/pg"); // Import PostgreSQL pg
const { addOneDay } = require("../../../utils/expiredate"); // Import utility for adding one day to a date
const { divideAndRoundUp } = require("../../../utils/pageCalculator"); // Import utility for pagination calculations
const { activityMiddleware } = require("../../../middleware/activity"); // Import activity middleware
const validateCode = require("../../../utils/datecode");

// Function to handle POST request for creating or updating a savings product
const manageSavingsProduct = async (req, res) => {
    // Extract required fields from the request body
    const { id, productname, currency, allowdeposit, allowwithdrawal, withdrawallimit, withdrawalcharges, withdrawalchargetype, withdrawalchargeinterval, depositcharge, depositechargetype, withdrawallimittype, activationfee, minimumaccountbalance, allowoverdrawn, compulsorydeposit, compulsorydeposittype, compulsorydepositspillover, compulsorydepositfrequency, compulsorydepositfrequencyamount, compulsorydepositfrequencyskip, compulsorydepositpenalty, compulsorydepositpenaltytype, compulsorydepositpenaltyfrom, compulsorydepositpenaltyfallbackfrom, compulsorydepositdeficit, status, interestrowsize, deductionrowsize, ...body } = req.body;

    const user = req.user;

    // Validate currency
    const validCurrencies = ["NGN", "USD"];
    if (!validCurrencies.includes(currency)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `The currency provided (${currency}) is not valid. Please use one of the following valid currencies: ${validCurrencies.join(", ")}.`,
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid currency"]
        });
    }

    // Validate withdrawalchargetype
    const validWithdrawalChargeTypes = ["PERCENTAGE", "AMOUNT"];
    if (!validWithdrawalChargeTypes.includes(withdrawalchargetype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `The 'withdrawalchargetype' value provided (${withdrawalchargetype}) is not valid. Please use one of the following valid options: ${validWithdrawalChargeTypes.join(", ")}.`,
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid withdrawalchargetype"]
        });
    }

    // Validate withdrawalchargeinterval
    if(!validateCode(withdrawalchargeinterval)){
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `The 'withdrawalchargeinterval' value Invalid`,
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid withdrawalchargeinterval"]
        }); 
    }

    // Validate withdrawallimittype
    const validWithdrawalLimitTypes = ["PERCENTAGE", "AMOUNT"];
    if (!validWithdrawalLimitTypes.includes(withdrawallimittype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `The 'withdrawallimittype' value provided (${withdrawallimittype}) is not valid. Please use one of the following valid options: ${validWithdrawalLimitTypes.join(", ")}.`,
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid withdrawallimittype"]
        });
    }

    // Validate depositechargetype
    const validDepositChargeTypes = ["PERCENTAGE", "AMOUNT"];
    if (!validDepositChargeTypes.includes(depositechargetype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `The 'depositechargetype' value provided (${depositechargetype}) is not valid. Please use one of the following valid options: ${validDepositChargeTypes.join(", ")}.`,
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid depositechargetype"]
        });
    }

    // Validate compulsorydeposittype
    const validCompulsoryDepositTypes = ["FIXED", "MINIMUM"];
    if (!validCompulsoryDepositTypes.includes(compulsorydeposittype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `The 'compulsorydeposittype' value provided (${compulsorydeposittype}) is not valid. Please use one of the following valid options: ${validCompulsoryDepositTypes.join(", ")}.`,
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid compulsorydeposittype"]
        });
    }

    // Validate compulsorydepositfrequency
    if(!validateCode(compulsorydepositfrequency)){
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `The 'compulsorydepositfrequency' value Invalid`,
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid compulsorydepositfrequency"]
        }); 
    }

    // Validate compulsorydepositpenaltytype
    const validCompulsoryDepositPenaltyTypes = ["AMOUNT", "PERCENTAGE"];
    if (!validCompulsoryDepositPenaltyTypes.includes(compulsorydepositpenaltytype)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `The 'compulsorydepositpenaltytype' value provided (${compulsorydepositpenaltytype}) is not valid. Please use one of the following valid options: ${validCompulsoryDepositPenaltyTypes.join(", ")}.`,
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid compulsorydepositpenaltytype"]
        });
    }

    // Validate compulsorydepositdeficit and compulsorydepositpenalty
    if (compulsorydepositdeficit && compulsorydepositpenalty !== 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: `The 'compulsorydepositpenalty' must be zero when 'compulsorydepositdeficit' is true.`,
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid compulsorydepositpenalty"]
        });
    }

    // Process interests
    const interests = [];
    for (let i = 1; i <= interestrowsize; i++) {
        const interestname = body[`interestname${i}`];
        const interestmethod = body[`interestmethod${i}`];
        const eligibilityaccountage = body[`eligibilityaccountage${i}`];
        const eligibilitybalance = body[`eligibilitybalance${i}`];
        const interestamount = body[`interestamount${i}`];
        const interesttype = body[`interesttype${i}`];
        const interestfrequency = body[`interestfrequency${i}`];
        const interestfrequencynumber = body[`interestfrequencynumber${i}`] || 0;
        const interestfrequencyskip = body[`interestfrequencyskip${i}`] || 0;
        const goforapproval = body[`goforapproval${i}`];

        // Validate interesttype
        const validInterestTypes = ["PERCENTAGE", "AMOUNT"];
        if (!validInterestTypes.includes(interesttype)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `The 'interesttype' value provided (${interesttype}) is not valid. Please use one of the following valid options: ${validInterestTypes.join(", ")}.`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Invalid interesttype"]
            });
        }

        // Validate interestfrequency
        if(!validateCode(interestfrequency)){
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `The 'interestfrequency' value Invalid`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Invalid interestfrequency"]
            });
        }

        interests.push({
            interestname,
            interestmethod,
            eligibilityaccountage,
            eligibilitybalance,
            interestamount,
            interesttype,
            interestfrequency,
            interestfrequencynumber,
            interestfrequencyskip,
            goforapproval
        });
    }

    // Process deductions
    const deductions = [];
    for (let i = 1; i <= deductionrowsize; i++) {
        const deductionname = body[`deductionname${i}`];
        const eligibilityaccountage = body[`eligibilityaccountage${i}`];
        const eligibilitybalance = body[`eligibilitybalance${i}`];
        const deductionamount = body[`deductionamount${i}`];
        const deductiontype = body[`deductiontype${i}`];
        const deductionmethod = body[`deductionmethod${i}`];
        const deductionfrequency = body[`deductionfrequency${i}`];
        const deductionfrequencynumber = body[`deductionfrequencynumber${i}`] || 0;
        const deductionfrequencyskip = body[`deductionfrequencyskip${i}`] || 0;
        const goforapproval = body[`goforapproval${i}`];

        // Validate deductiontype
        const validDeductionTypes = ["PERCENTAGE", "AMOUNT"];
        if (!validDeductionTypes.includes(deductiontype)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `The 'deductiontype' value provided (${deductiontype}) is not valid. Please use one of the following valid options: ${validDeductionTypes.join(", ")}.`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Invalid deductiontype"]
            });
        }

        // Validate deductionmethod
        const validDeductionMethods = ["LATEST BALANCE", "PRO RATA BASIS"];
        if (!validDeductionMethods.includes(deductionmethod)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `The 'deductionmethod' value provided (${deductionmethod}) is not valid. Please use one of the following valid options: ${validDeductionMethods.join(", ")}.`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Invalid deductionmethod"]
            });
        }

        // Validate deductionfrequency
        if(!validateCode(deductionfrequency)){
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `The 'deductionfrequency' value Invalid`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Invalid deductionfrequency"]
            });
        }

        deductions.push({
            deductionname,
            eligibilityaccountage,
            eligibilitybalance,
            deductionamount,
            deductiontype,
            deductionmethod,
            deductionfrequency,
            deductionfrequencynumber,
            deductionfrequencyskip,
            goforapproval
        });
    }

    try {
        try {
            await pg.query('BEGIN');

            if (id) {
                // Update existing product
                await pg.query(`UPDATE divine."savingsproduct" SET productname = $1, currency = $2, allowdeposit = $3, allowwithdrawal = $4, withdrawallimit = $5, withdrawalcharges = $6, withdrawalchargetype = $7, withdrawalchargeinterval = $8, depositcharge = $9, depositechargetype = $10, withdrawallimittype = $11, activationfee = $12, minimumaccountbalance = $13, allowoverdrawn = $14, compulsorydeposit = $15, compulsorydeposittype = $16, compulsorydepositspillover = $17, compulsorydepositfrequency = $18, compulsorydepositfrequencyamount = $19, compulsorydepositfrequencyskip = $20, compulsorydepositpenalty = $21, compulsorydepositpenaltytype = $22, compulsorydepositpenaltyfrom = $23, compulsorydepositpenaltyfallbackfrom = $24, compulsorydepositdeficit = $25, status = $26, updatedat = NOW() WHERE id = $27`, [productname, currency, allowdeposit, allowwithdrawal, withdrawallimit, withdrawalcharges, withdrawalchargetype, withdrawalchargeinterval, depositcharge, depositechargetype, withdrawallimittype, activationfee, minimumaccountbalance, allowoverdrawn, compulsorydeposit, compulsorydeposittype, compulsorydepositspillover, compulsorydepositfrequency, compulsorydepositfrequencyamount, compulsorydepositfrequencyskip, compulsorydepositdeficit ? 0 : compulsorydepositpenalty, compulsorydepositpenaltytype, compulsorydepositpenaltyfrom, compulsorydepositpenaltyfallbackfrom, compulsorydepositdeficit, status, id]);

                // Delete existing interests and deductions
                await pg.query(`DELETE FROM divine."Interest" WHERE savingsproductid = $1`, [id]);
                await pg.query(`DELETE FROM divine."Deduction" WHERE savingsproductid = $1`, [id]);

                // Save new interests
                for (const interest of interests) {
                    await pg.query(`INSERT INTO divine."Interest" (savingsproductid, interestname, interestmethod, eligibilityaccountage, eligibilitybalance, interestamount, interesttype, interestfrequency, interestfrequencynumber, interestfrequencyskip, goforapproval) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [id, interest.interestname, interest.interestmethod, parseInt(interest.eligibilityaccountage), parseFloat(interest.eligibilitybalance), parseFloat(interest.interestamount), interest.interesttype, interest.interestfrequency, parseInt(interest.interestfrequencynumber), parseInt(interest.interestfrequencyskip), interest.goforapproval === 'true' ? true : false]);
                }

                // Save new deductions
                for (const deduction of deductions) {
                    await pg.query(`INSERT INTO divine."Deduction" (savingsproductid, deductionname, eligibilityaccountage, eligibilitybalance, deductionamount, deductiontype, deductionmethod, deductionfrequency, deductionfrequencynumber, deductionfrequencyskip, goforapproval) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [id, deduction.deductionname, parseInt(deduction.eligibilityaccountage), parseFloat(deduction.eligibilitybalance), parseFloat(deduction.deductionamount), deduction.deductiontype, deduction.deductionmethod, deduction.deductionfrequency, parseInt(deduction.deductionfrequencynumber), parseInt(deduction.deductionfrequencyskip), deduction.goforapproval === 'true' ? true : false]);
                }

                await pg.query('COMMIT');

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
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        status: false,
                        message: "Product already exists",
                        statuscode: StatusCodes.BAD_REQUEST,
                        data: null,
                        errors: ["Product already exists"]
                    });
                } 

                const insertProductQuery = `INSERT INTO divine."savingsproduct" (productname, currency, allowdeposit, allowwithdrawal, withdrawallimit, withdrawalcharges, withdrawalchargetype, withdrawalchargeinterval, depositcharge, depositechargetype, withdrawallimittype, activationfee, minimumaccountbalance, allowoverdrawn, compulsorydeposit, compulsorydeposittype, compulsorydepositspillover, compulsorydepositfrequency, compulsorydepositfrequencyamount, compulsorydepositfrequencyskip, compulsorydepositpenalty, compulsorydepositpenaltytype, compulsorydepositpenaltyfrom, compulsorydepositpenaltyfallbackfrom, compulsorydepositdeficit, status, dateadded) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW()) RETURNING id`;
                const { rows: [product] } = await pg.query(insertProductQuery, [productname, currency, allowdeposit, allowwithdrawal, withdrawallimit, withdrawalcharges, withdrawalchargetype, withdrawalchargeinterval, depositcharge, depositechargetype, withdrawallimittype, activationfee, minimumaccountbalance, allowoverdrawn, compulsorydeposit, compulsorydeposittype, compulsorydepositspillover, compulsorydepositfrequency, compulsorydepositfrequencyamount, compulsorydepositfrequencyskip, compulsorydepositdeficit ? 0 : compulsorydepositpenalty, compulsorydepositpenaltytype, compulsorydepositpenaltyfrom, compulsorydepositpenaltyfallbackfrom, compulsorydepositdeficit, status]);
                const id = product.id;

                // Save interests  
                for (const interest of interests) {
                    const insertInterestQuery = `INSERT INTO divine."Interest" (savingsproductid, interestname, interestmethod, eligibilityaccountage, eligibilitybalance, interestamount, interesttype, interestfrequency, interestfrequencynumber, interestfrequencyskip, goforapproval) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
                    await pg.query(insertInterestQuery, [id, interest.interestname, interest.interestmethod, parseInt(interest.eligibilityaccountage), parseFloat(interest.eligibilitybalance), parseFloat(interest.interestamount), interest.interesttype, interest.interestfrequency, parseInt(interest.interestfrequencynumber), parseInt(interest.interestfrequencyskip), interest.goforapproval == 'true' ? true : false]);
                }

                // Save deductions 
                for (const deduction of deductions) {
                    const insertDeductionQuery = `INSERT INTO divine."Deduction" (savingsproductid, deductionname, eligibilityaccountage, eligibilitybalance, deductionamount, deductiontype, deductionmethod, deductionfrequency, deductionfrequencynumber, deductionfrequencyskip, goforapproval) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
                    await pg.query(insertDeductionQuery, [id, deduction.deductionname, parseInt(deduction.eligibilityaccountage), parseFloat(deduction.eligibilitybalance), parseFloat(deduction.deductionamount), deduction.deductiontype, deduction.deductionmethod, deduction.deductionfrequency, parseInt(deduction.deductionfrequencynumber), parseInt(deduction.deductionfrequencyskip), deduction.goforapproval == 'true' ? true : false]);
                }

                await pg.query('COMMIT');

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
            await pg.query('ROLLBACK');
            throw error;
        } 
    } catch (error) {
        console.error(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal Server Error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: ["An unexpected error occurred while managing the savings product"]
        });
    }
}

module.exports = { 
    manageSavingsProduct
};





