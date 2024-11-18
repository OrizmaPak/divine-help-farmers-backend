const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const getLoanAccount = async (req, res) => {
    const user = req.user;
    const { id } = req.params;

    try {
        // Check if the loan account exists
        const loanAccountQuery = {
            text: 'SELECT * FROM divine."loanaccounts" WHERE id = $1',
            values: [id]
        };
        const { rows: loanAccountRows } = await pg.query(loanAccountQuery);

        if (loanAccountRows.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: 'Loan account not found',
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const loanAccount = loanAccountRows[0];

        await activityMiddleware(req, user.id, 'Loan account fetched successfully', 'LOAN_ACCOUNT');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Loan account fetched successfully",
            statuscode: StatusCodes.OK,
            data: loanAccount,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching loan account', 'LOAN_ACCOUNT');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getLoanAccount };
