const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");

const updateDisbursementRef = async (req, res) => {
    const { accountnumber, disbursementref } = req.body;

    // Validation: Check if accountnumber and disbursementref are provided
    if (!accountnumber || !disbursementref) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Account number and disbursement reference are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Account number and disbursement reference are required"]
        });
    }

    try {
        // Update the disbursement reference for the given loan account
        const updateQuery = {
            text: `UPDATE divine."loanaccounts" SET disbursementref = $1, disbursementdate = NOW() WHERE accountnumber = $2 RETURNING userid`,
            values: [disbursementref, accountnumber]
        };
        const updateResult = await pg.query(updateQuery);

        if (updateResult.rowCount === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Loan account not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: ["Loan account not found"]
            });
        }

        const { userid } = updateResult.rows[0];

        // Fetch user email and name
        const userQuery = {
            text: `SELECT email, firstname FROM divine."users" WHERE id = $1`,
            values: [userid]
        };
        const userResult = await pg.query(userQuery);
        const user = userResult.rows[0];

        if (user && user.email) {
            // Send congratulatory email
            const emailSubject = 'Loan Approved and Disbursed';
            const emailBody = `Dear ${user.firstname},\n\nCongratulations! Your loan has been approved and disbursed. Please check your account for details.\n\nThank you.`;
            await sendEmail(user.email, emailSubject, emailBody);
        }

        // Create congratulatory notification
        const notificationQuery = {
            text: `INSERT INTO divine."notification" (userid, title, description, dateadded, createdby, status, location) VALUES ($1, $2, $3, NOW(), $4, 'ACTIVE', $5)`,
            values: [
                userid,
                'Loan Approved and Disbursed',
                'Congratulations! Your loan has been approved and disbursed. Please check your account for details.',
                0,
                'loanaccount'
            ]
        };
        await pg.query(notificationQuery);

        // Successfully updated the disbursement reference
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Disbursement reference updated successfully",
            statuscode: StatusCodes.OK,
            data: null, 
            errors: null
        });

    } catch (error) {
        console.error("Error updating disbursement reference:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal server error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = {
    updateDisbursementRef
};
