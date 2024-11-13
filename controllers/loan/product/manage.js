const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");

// Function to manage loan product creation and update
const manageLoanProduct = async (req, res) => {
    // Destructure request body to get loan product details
    const { id, productname, description, interestmethod, interestrate, repaymentsettings, repaymentfrequency, numberofrepayments, duration, durationcategory, currency, excludebranch, productofficer, defaultpenaltyid, status = 'ACTIVE', dateadded = new Date() } = req.body;

    // Get user information from request
    const user = req.user;

    // Initialize an array to store validation errors
    const errors = [];

    // Validate product name
    if (!productname) {
        errors.push({
            field: 'productname',
            message: 'Product name not found'
        });
    } else if (typeof productname !== 'string' || productname.trim() === '') {
        errors.push({
            field: 'productname',
            message: 'Product name must be a non-empty string'
        });
    }

    // Validate interest method
    if (!interestmethod) {
        errors.push({
            field: 'interestmethod',
            message: 'Interest method not found'
        });
    } else if (typeof interestmethod !== 'string' || !['NO INTEREST', 'FLAT RATE', 'ONE OF INTEREST', 'INTEREST ONLY', 'EQUAL INSTALLMENTS'].includes(interestmethod)) {
        errors.push({
            field: 'interestmethod',
            message: 'Interest method must be one of "NO INTEREST", "FLAT RATE", "ONE OF INTEREST", "INTEREST ONLY", or "EQUAL INSTALLMENTS"'
        });
    }

    // Validate interest rate
    if (!interestrate) {
        errors.push({
            field: 'interestrate',
            message: 'Interest rate not found'
        });
    } else if (typeof interestrate !== 'number' || interestrate <= 0) {
        errors.push({
            field: 'interestrate',
            message: 'Interest rate must be a positive number'
        });
    }

    // Validate repayment settings
    if (!repaymentsettings) {
        errors.push({
            field: 'repaymentsettings',
            message: 'Repayment settings not found'
        });
    } else if (typeof repaymentsettings !== 'string' || !['ACCOUNT', 'PRODUCT'].includes(repaymentsettings)) {
        errors.push({
            field: 'repaymentsettings',
            message: 'Repayment settings must be one of "ACCOUNT" or "PRODUCT"'
        });
    }

    // Validate repayment frequency if provided
    if (repaymentfrequency && !validateCode(repaymentfrequency)) {
        errors.push({
            field: 'repaymentfrequency',
            message: 'Repayment frequency is invalid'
        });
    }

    // Validate number of repayments if provided
    if (numberofrepayments !== undefined && (typeof numberofrepayments !== 'number' || isNaN(parseInt(numberofrepayments)))) {
        errors.push({
            field: 'numberofrepayments',
            message: 'Number of repayments must be a valid number'
        });
    }

    // Validate duration if provided
    if (duration !== undefined && (typeof duration !== 'number' || isNaN(parseInt(duration)))) {
        errors.push({
            field: 'duration',
            message: 'Duration must be a valid number'
        });
    }

    // If there are validation errors, return a bad request response
    if (errors.length > 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Validation Errors",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: errors
        });
    }

    try {
        // Check if the product name is unique
        const productNameQuery = {
            text: 'SELECT * FROM divine."loanproduct" WHERE productname = $1',
            values: [productname]
        };
        const { rows: productNameRows } = await pg.query(productNameQuery);

        // If product name is not unique, return a bad request response
        if (productNameRows.length > 0 && (!id || productNameRows[0].id !== id)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Product name must be unique',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Check if the default penalty ID exists in the defaultloanpenalty table
        if (defaultpenaltyid) {
            const penaltyQuery = {
                text: 'SELECT * FROM divine."defaultloanpenalty" WHERE id = $1',
                values: [defaultpenaltyid]
            };
            const { rows: penaltyRows } = await pg.query(penaltyQuery);

            // If default penalty ID is invalid, return a bad request response
            if (penaltyRows.length === 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: 'Invalid default penalty ID provided',
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        }

        // Check if the product officer exists in the user table
        if (productofficer) {
            const productOfficerQuery = {
                text: 'SELECT * FROM divine."user" WHERE id = $1',
                values: [productofficer]
            };
            const { rows: productOfficerRows } = await pg.query(productOfficerQuery);

            // If product officer ID is invalid, return a bad request response
            if (productOfficerRows.length === 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: 'Invalid product officer ID provided',
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        }

        let loanProduct;
        if (id) {
            // Update existing loan product
            const updateLoanProductQuery = {
                text: `UPDATE divine."loanproduct" SET 
                        productname = COALESCE($1, productname), 
                        description = COALESCE($2, description), 
                        interestmethod = COALESCE($3, interestmethod), 
                        interestrate = COALESCE($4, interestrate), 
                        repaymentsettings = COALESCE($5, repaymentsettings), 
                        repaymentfrequency = COALESCE($6, repaymentfrequency), 
                        numberofrepayments = COALESCE($7, numberofrepayments), 
                        duration = COALESCE($8, duration), 
                        durationcategory = COALESCE($9, durationcategory), 
                        currency = COALESCE($10, currency), 
                        excludebranch = COALESCE($11, excludebranch), 
                        productofficer = COALESCE($12, productofficer), 
                        defaultpenaltyid = COALESCE($13, defaultpenaltyid), 
                        status = COALESCE($14, status) 
                       WHERE id = $15 RETURNING *`,
                values: [productname, description, interestmethod, interestrate, repaymentsettings, repaymentfrequency, numberofrepayments, duration, durationcategory, currency, excludebranch, productofficer, defaultpenaltyid, status, id]
            };
            const { rows: updatedLoanProductRows } = await pg.query(updateLoanProductQuery);
            loanProduct = updatedLoanProductRows[0];
        } else {
            // Create new loan product
            const createLoanProductQuery = {
                text: `INSERT INTO divine."loanproduct" (productname, description, interestmethod, interestrate, repaymentsettings, repaymentfrequency, numberofrepayments, duration, durationcategory, currency, excludebranch, productofficer, defaultpenaltyid, status, dateadded, createdby) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
                values: [productname, description, interestmethod, interestrate, repaymentsettings, repaymentfrequency, numberofrepayments, duration, durationcategory, currency, excludebranch, productofficer, defaultpenaltyid, "ACTIVE", new Date(), user.id]
            };
            const { rows: createdLoanProductRows } = await pg.query(createLoanProductQuery);
            loanProduct = createdLoanProductRows[0];
        }

        // Return success response with loan product data
        res.status(StatusCodes.OK).json({
            status: true,
            message: id ? `Loan product ${productname} updated successfully` : `Loan product ${productname} created successfully`,
            statuscode: StatusCodes.OK,
            data: loanProduct,
            errors: []
        });
    } catch (error) {
        // Log unexpected error and return internal server error response
        console.error('Unexpected Error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: []
        });
    }
};

module.exports = { manageLoanProduct };
