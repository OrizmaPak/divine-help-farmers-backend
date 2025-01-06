const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { divideAndRoundUp } = require("../../../utils/pageCalculator");

const getPurchaseOrder = async (req, res) => {
    const user = req.user;

    try {
        let query = {
            text: `SELECT reference, MAX(id) as id, MAX(transactiondate) as transactiondate, MAX(supplier) as supplier FROM divine."Inventory" WHERE status = 'PO' GROUP BY reference`,
            values: []
        };

        // Add pagination
        const searchParams = new URLSearchParams(req.query);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || process.env.DEFAULT_LIMIT, 10);
        const offset = (page - 1) * limit;

        query.text += ` LIMIT $1 OFFSET $2`;
        query.values.push(limit, offset);

        const result = await pg.query(query);
        const purchaseOrders = result.rows;

        if (purchaseOrders.length === 0) {
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No purchase orders found",
                statuscode: StatusCodes.OK,
                data: [],
                errors: ["No purchase orders found"]
            });
        }

        // Get total count for pagination
        const countQuery = {
            text: `SELECT COUNT(DISTINCT reference) FROM divine."Inventory" WHERE status = 'PO'`,
            values: []
        };
        const { rows: [{ count: total }] } = await pg.query(countQuery);
        const pages = divideAndRoundUp(total, limit);

        await activityMiddleware(req, user.id, 'Purchase orders fetched successfully', 'PURCHASE ORDER');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Purchase orders fetched successfully",
            statuscode: StatusCodes.OK,
            data: purchaseOrders,
            pagination: {
                total: Number(total),
                pages,
                page,
                limit
            },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching purchase orders', 'PURCHASE ORDER');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getPurchaseOrder };
