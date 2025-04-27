const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");
const { activityMiddleware } = require("../../middleware/activity");

const getNotificationsByUserId = async (req, res) => {
    const user = req.user;

    try {
        // Fetch notifications for the given user ID
        let queryText = `SELECT * FROM divine."notification" WHERE userid = $1`;
        const queryValues = [user.id];

        // Fetch notifications for the user's department if the role is not MEMBER
        if (user.role != 'MEMBER') {
            queryText += ` UNION SELECT * FROM divine."notification" WHERE department = $2`;
            queryValues.push(user.department);
        }

        queryText += ` ORDER BY dateadded DESC`;

        const query = {
            text: queryText,
            values: queryValues
        }; 

        const result = await pg.query(query);
        const notifications = result.rows;

        // Log activity
        await activityMiddleware(req, user.id, 'Notifications fetched successfully', 'NOTIFICATION_FETCH');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Notifications fetched successfully",
            statuscode: StatusCodes.OK,
            data: notifications,
            errors: []
        });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        await activityMiddleware(req, user.id, 'Error fetching notifications', 'NOTIFICATION_FETCH_ERROR');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal server error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getNotificationsByUserId };
