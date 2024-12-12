const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const updateReturnItem = async (req, res) => {
    const { id, status, supplier } = req.body;

    // Validate the presence of id, status, and supplier
    if (!id || !status || !supplier) {
        await activityMiddleware(res, req.user.id, 'Missing compulsory id, status, or supplier', 'UPDATE_RETURN_ITEM');
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "ID, status, and supplier are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["ID, status, and supplier are required"]
        });
    }

    try {
        // Check if the item exists in the inventory
        const { rows: itemExists } = await pg.query(`SELECT * FROM divine."Inventory" WHERE id = $1 AND status = 'ACTIVE'`, [id]);
        if (itemExists.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Item not found in the inventory",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: ["Item not found in the inventory"]
            });
        }

        // Update the status and supplier of the item in the inventory
        await pg.query(`UPDATE divine."Inventory" SET status = $1, supplier = $2 WHERE id = $3`, ['RETURNED ITEMS', supplier, id]);

        // Log activity for the update
        await activityMiddleware(req, req.user.id, `Status and supplier for item ID ${id} updated to RETURNED ITEMS and ${supplier}`, 'UPDATE_RETURN_ITEM');

        // Return success response
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "item(s) returned successful",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, req.user.id, 'An unexpected error occurred updating return item', 'UPDATE_RETURN_ITEM');
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: []
        });
    }
};

module.exports = { updateReturnItem };
