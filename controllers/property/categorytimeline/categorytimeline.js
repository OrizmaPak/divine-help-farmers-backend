const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const saveOrUpdateCategoryTimeline = async (req, res) => {
    const user = req.user;
    const { id, valuefrom, valueto, numberofdays } = req.body;

    try {
        // Validate input
        if (!valuefrom || !valueto || !numberofdays) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Invalid input",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["valuefrom, valueto, and numberofdays are required"]
            });
        }

        let query;
        if (id) {
            // Update existing categorytimeline
            query = {
                text: `UPDATE divine."categorytimeline" 
                       SET valuefrom = $1, valueto = $2, numberofdays = $3, createdby = $4, dateadded = NOW(), status = 'ACTIVE'
                       WHERE id = $5`,
                values: [valuefrom, valueto, numberofdays, user.id, id]
            };
        } else {
            // Insert new categorytimeline
            query = {
                text: `INSERT INTO divine."categorytimeline" (valuefrom, valueto, numberofdays, createdby, dateadded, status) 
                       VALUES ($1, $2, $3, $4, NOW(), 'ACTIVE')`,
                values: [valuefrom, valueto, numberofdays, user.id]
            };
        }

        await pg.query(query);

        const action = id ? 'updated' : 'saved';
        await activityMiddleware(req, user.id, `Category timeline ${action} successfully`, 'CATEGORY_TIMELINE');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: `Category timeline ${action} successfully`,
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred saving category timeline', 'CATEGORY_TIMELINE');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { saveOrUpdateCategoryTimeline };

