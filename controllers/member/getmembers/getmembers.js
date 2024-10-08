const { StatusCodes } = require("http-status-codes");
const { activityMiddleware } = require("../../../middleware/activity");
const pg = require("../../../db/pg");

const getUsers = async (req, res) => {
    const user = req.user;

    try {
        let query = {
            text: `SELECT * FROM "User"`,
            values: []
        };

        // Dynamically build the WHERE clause based on query parameters
        let whereClause = '';
        let valueIndex = 1;
        Object.keys(req.query).forEach((key, index) => {
            if (whereClause) {
                whereClause += ` AND `;
            } else {
                whereClause += ` WHERE `;
            }
            whereClause += `"${key}" = $${valueIndex}`;
            query.values.push(req.query[key]);
            valueIndex++;
        });

        query.text += whereClause;

        const result = await pg.query(query);
        const users = result.rows;

        await activityMiddleware(req, user.id, 'Users fetched successfully', 'USER');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Users fetched successfully",
            statuscode: StatusCodes.OK,
            data: users,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching users', 'USER');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getUsers };
