const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const approveDeclineBulkTransactions = async (req, res) => {
    const user = req.user;
    const { rowsize } = req.body;

    try {
        if (!rowsize || rowsize <= 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Invalid rowsize provided",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Rowsize must be a positive integer"]
            });
        }

        const updates = [];
        for (let i = 1; i <= rowsize; i++) {
            const id = req.body[`id${i}`];
            const credit = req.body[`credit${i}`];
            const debit = req.body[`debit${i}`];
            const status = req.body[`status${i}`];

            if (!id || !status) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: `Missing required fields for row ${i}`,
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: [`id${i} and status${i} are required`]
                });
            }

            const updateQuery = {
                text: `UPDATE divine."transaction" 
                       SET credit = $1, debit = $2, status = $3 
                       WHERE id = $4`,
                values: [credit || 0, debit || 0, status, id]
            };

            updates.push(pg.query(updateQuery));
        }

        await Promise.all(updates);

        await activityMiddleware(req, user.id, 'Bulk transactions updated successfully', 'TRANSACTION');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Bulk transactions updated successfully",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred updating bulk transactions', 'TRANSACTION');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { approveDeclineBulkTransactions };
