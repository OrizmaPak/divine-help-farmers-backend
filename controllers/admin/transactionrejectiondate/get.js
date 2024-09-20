const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");

const getTransactionRejectionDate = async (req, res) => {
    try {
        const { startDate, endDate, branch } = req.query;
        // let query = `SELECT * FROM divine."Rejecttransactiondate" WHERE status = ACTIVE`;
        let query = `SELECT r.*, b.branch AS branchname FROM divine."Rejecttransactiondate" r LEFT JOIN divine."Branch" b ON r.branch = b.id WHERE status = ACTIVE`;
        let params = [];

        if (startDate && endDate) {
            query += ` AND r.rejectiondate BETWEEN $1 AND $2`;
            params = [startDate, endDate];
        } else if (startDate) {
            query += ` AND r.rejectiondate >= $1`;
            params = [startDate];
        } else if (endDate) {
            query += ` AND r.rejectiondate <= $1`;
            params = [endDate];
        }

        if (branch) {
            query += ` AND r.branch = $${params.length + 1}`;
            params.push(branch);
        }

        const { rows } = await pg.query(query, params);

        if (rows.length > 0) {
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Transaction rejection dates fetched successfully",
                statuscode: StatusCodes.OK,
                data: rows,
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
    getTransactionRejectionDate
};

