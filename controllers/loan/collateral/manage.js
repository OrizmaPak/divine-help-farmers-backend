const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");

async function addCollateral(req, res) {
    // if (req.files) {
    //     await uploadToGoogleDrive(req, res);
    //   }
    const { accountnumber, documenttitle, documentnumber, description, docposition, worth, file1, file2, file3, file4, file5, documentexpiration } = req.body;

    // res.status(StatusCodes.OK).json({
    //     status: true,
    //     message: "Collateral added successfully",
    //     statuscode: StatusCodes.OK,
    //     data: {accountnumber, documenttitle, documentnumber, description, docposition, worth, file1, file2, file3, file4, file5, documentexpiration},
    //     errors: [] 
    // });

    // Advanced validation for compulsory inputs
    const errors = [];

    // Validate account number
    if (!accountnumber) {
        errors.push({
            field: 'accountnumber',
            message: 'Account number is required'
        });
    } else if (isNaN(parseInt(accountnumber))) {
        errors.push({
            field: 'accountnumber',
            message: 'Account number must be a number'
        });
    } 

    // Validate document title
    if (!documenttitle) {
        errors.push({
            field: 'documenttitle',
            message: 'Document title is required'
        });
    } else if (typeof documenttitle !== 'string') {
        errors.push({
            field: 'documenttitle',
            message: 'Document title must be a string'
        });
    }

    // Validate document number
    if (!documentnumber) {
        errors.push({
            field: 'documentnumber',
            message: 'Document number is required'
        });
    } else if (typeof documentnumber !== 'string') {
        errors.push({
            field: 'documentnumber',
            message: 'Document number must be a string'
        });
    }

    // Validate description
    if (!description) {
        errors.push({
            field: 'description',
            message: 'Description is required'
        });
    } else if (typeof description !== 'string') {
        errors.push({
            field: 'description',
            message: 'Description must be a string'
        });
    }

    // Validate document position
    const validDocPositions = ["ISSUED", "WITHHELD", "INVALID", "RETURNED", "DESTROYED", "LOST", "DAMAGED", "RECOVERED"];
    if (!docposition) {
        errors.push({
            field: 'docposition',
            message: 'Document position is required'
        });
    } else if (typeof docposition !== 'string') {
        errors.push({
            field: 'docposition',
            message: 'Document position must be a string'
        });
    } else if (!validDocPositions.includes(docposition)) {
        errors.push({
            field: 'docposition',
            message: `Document position must be one of the following: ${validDocPositions.join(', ')}`
        });
    }

    // Validate worth 
    if (worth === undefined || worth === '' || isNaN(parseFloat(worth))) {
        errors.push({
            field: 'worth',
            message: 'Worth must be a number'
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

        // Check if the document number already exists for the account number with the docposition of 'ISSUED'
        const existingDocumentQuery = `
            SELECT * FROM divine."collateral" 
            WHERE accountnumber = $1 AND documentnumber = $2 AND docposition = 'ISSUED'
        `;
        const existingDocumentResult = await pg.query(existingDocumentQuery, [accountnumber, documentnumber]);

        if (existingDocumentResult.rows.length > 0) {
            return res.status(StatusCodes.CONFLICT).json({
                status: false,
                message: "Document number already exists for the account number with the document position of 'ISSUED'",
                statuscode: StatusCodes.CONFLICT,
                data: null,
                errors: []
            });
        }

        // Verify that the accountnumber exists in the loanaccounts table
        // const accountCheck = await pg.query(`SELECT * FROM divine."loanaccounts" WHERE accountnumber = $1`, [accountnumber]);
        // if (accountCheck.rows.length === 0) {
        //     return res.status(StatusCodes.NOT_FOUND).json({
        //         status: false,
        //         message: "Account number does not exist",
        //         statuscode: StatusCodes.NOT_FOUND,
        //         data: null,
        //         errors: []
        //     });
        // }

        // Insert the new collateral record
        const newCollateral = await pg.query(
            `INSERT INTO divine."collateral" (accountnumber, documenttitle, documentnumber, description, docposition, worth, file1, file2, file3, file4, file5, documentexpiration, dateadded, createdby)  
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13) RETURNING *`,
            [accountnumber, documenttitle, documentnumber, description, docposition, worth, file1, file2, file3, file4, file5, documentexpiration, req.user.id]
        );

        return res.status(StatusCodes.CREATED).json({
            status: true,
            message: "Collateral added successfully",
            statuscode: StatusCodes.CREATED,
            data: newCollateral.rows[0],
            errors: []
        });
    } catch (err) {
        console.error('Unexpected Error:', err);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: []
        });
    }
}

module.exports = { addCollateral };
