const { StatusCodes } = require("http-status-codes"); // Importing StatusCodes for HTTP status codes
const pg = require("../../../db/pg"); // Importing PostgreSQL client
const { activityMiddleware } = require("../../../middleware/activity"); // Importing activity middleware for tracking

// Function to manage transaction rejection dates
const managerejection = async (req, res) => {
    const { id, rejectiondate, branch, reason } = req.body; // Extracting request body parameters

    // Validating rejection date
    if (!rejectiondate || isNaN(Date.parse(rejectiondate)) || new Date(rejectiondate) < new Date()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Rejection date is compulsory, should be a valid date, and cannot be a past date",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    // Validating branch existence
    if (!branch) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Branch does not exist",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
    }

    // Validating branch existence
        const branchExists = await pg.query(`SELECT * FROM divine."Branch" WHERE id = $1`, [branch]);
        if (branchExists.rowCount === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Branch does not exist",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

    try {
        let query;
        let params;

        // Determining the query based on the presence of id
        if (id) {
            query = `UPDATE divine."Rejecttransactiondate" SET rejectiondate = $1, branch = $2, reason = $3 WHERE id = $4`;
            params = [rejectiondate, branch, reason, id];
        } else {
            // Checking if rejection date already exists for the branch
            const rejectionDateExists = await pg.query(`SELECT * FROM divine."Rejecttransactiondate" WHERE rejectiondate = $1 AND branch = $2`, [rejectiondate, branch]);
            if (rejectionDateExists.rowCount > 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Rejection date already exists for this branch",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
            query = `INSERT INTO divine."Rejecttransactiondate" (rejectiondate, branch, reason) VALUES ($1, $2, $3)`;
            params = [rejectiondate, branch, reason];
        }

        // Executing the query
        const { rowCount } = await pg.query(query, params);

        // Handling the result of the query execution
        if (rowCount > 0) {
            await activityMiddleware(res, req.user.id, `${id ? 'Updated' : 'Created'} transaction rejection date for ${branchExists.rows[0].branch}`, 'TRANSACTION_REJECTION_DATE');
            return res.status(StatusCodes.OK).json({
                status: true,
                message: `Registration Dated ${id ? 'Updated' : 'Created'} successfully`,
                statuscode: StatusCodes.OK,
                data: null,
                errors: []
            });
        } else {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "An unexpected error occurred",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: []
            });
        }
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

module.exports = {
    managerejection
};
