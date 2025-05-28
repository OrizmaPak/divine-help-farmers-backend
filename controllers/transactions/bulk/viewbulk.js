const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const viewBulkTransactions = async (req, res) => {
    const user = req.user;

    try {
        // Query to fetch transactions with unique reference starting with 'BULK||'
        const query = {
            text: `SELECT DISTINCT ON (reference) reference, description, transactiondate, credit, debit FROM divine."transaction" WHERE reference LIKE 'BULK||%'`,
            values: []
        };

        const { rows: transactions } = await pg.query(query);

        if (!transactions.length) {
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No bulk transactions found",
                statuscode: StatusCodes.OK,
                data: [],
                errors: []
            });
        }

        // Transform transactions into an array of objects
        const transformedTransactions = transactions.map(transaction => ({
            reference: transaction.reference,
            description: transaction.description,
            transactiondate: transaction.transactiondate,
            bulkaction: transaction.credit > 0 ? 'CREDIT' : 'DEBIT'
        }));

        await activityMiddleware(req, user.id, 'Bulk transactions viewed successfully', 'TRANSACTION');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Bulk transactions fetched successfully",
            statuscode: StatusCodes.OK,
            data: transformedTransactions,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching bulk transactions', 'TRANSACTION');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { viewBulkTransactions };
