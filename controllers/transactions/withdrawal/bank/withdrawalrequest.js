const { StatusCodes } = require("http-status-codes");
const pg = require("../../../../db/pg");
const { activityMiddleware } = require("../../../../middleware/activity");

const saveWithdrawalRequest = async (req, res) => {
    const { id, accountnumber, accounttype, userid, amount, description, requeststatus } = req.body;
    const user = req.user;

    // Validate required fields
    if (!accountnumber || !accounttype || !userid || !amount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Account number, account type, user ID, and amount are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        }); 
    }

    try {
        let query; 
        if (id) {
            // Update the existing withdrawal request
            query = { 
                text: `UPDATE divine."withdrawalrequest"
                       SET accountnumber = COALESCE($1, accountnumber),
                           accounttype = COALESCE($2, accounttype),
                           userid = COALESCE($3, userid),
                           amount = COALESCE($4, amount),
                           description = COALESCE($5, description),
                           requeststatus = COALESCE($6, requeststatus),
                           createdby = COALESCE($7, createdby),
                           dateadded = NOW(),
                           status = COALESCE('ACTIVE', status)
                       WHERE id = $8 RETURNING id`,
                values: [accountnumber, accounttype, userid, amount, description, requeststatus, user.id, id]
            };
        } else {
            // Insert a new withdrawal request
            query = {
                text: `INSERT INTO divine."withdrawalrequest" (accountnumber, accounttype, userid, amount, description, requeststatus, createdby, dateadded, status)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'ACTIVE') RETURNING id`,
                values: [accountnumber, accounttype, userid, amount, description, requeststatus || 'PENDING', user.id]
            };
        }

        const { rows } = await pg.query(query);
        const withdrawalRequestId = rows[0].id;

        await activityMiddleware(req, user.id, 'Withdrawal request processed successfully', 'WITHDRAWAL');

        // Create a notification
        const notificationQuery = {
            text: `INSERT INTO divine."notification" (userid, title, description, location, dateadded, createdby, status)
                   VALUES ($1, $2, $3, $4, NOW(), $5, 'ACTIVE')`,
            values: [userid, 'Withdrawal Request', 'Your withdrawal request has been created successfully.', 'viewwithdrawalrequest', user.id]
        };
        await pg.query(notificationQuery);

        return res.status(id ? StatusCodes.OK : StatusCodes.CREATED).json({
            status: true,
            message: "Withdrawal request processed successfully",
            statuscode: id ? StatusCodes.OK : StatusCodes.CREATED,
            data: { withdrawalRequestId },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred processing withdrawal request', 'WITHDRAWAL');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { saveWithdrawalRequest };
