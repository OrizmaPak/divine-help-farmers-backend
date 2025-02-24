const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");
const { activityMiddleware } = require("../../middleware/activity");

const deleteNotification = async (req, res) => {
    const user = req.user;
    const notificationId = req.params.id;

    if (!notificationId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Notification ID is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    try {
        // Delete the notification with the given ID
        const deleteQuery = {
            text: `DELETE FROM divine."notification" WHERE id = $1`,
            values: [notificationId]
        };
        const result = await pg.query(deleteQuery);
 
        if (result.rowCount === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Notification not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        // Log activity
        await activityMiddleware(req, user.id, 'Notification deleted successfully', 'NOTIFICATION_DELETE');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Notification deleted successfully",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) {
        console.error("Error deleting notification:", error);
        await activityMiddleware(req, user.id, 'Error deleting notification', 'NOTIFICATION_DELETE_ERROR');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal server error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { deleteNotification };
