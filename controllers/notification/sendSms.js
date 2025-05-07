const { StatusCodes } = require("http-status-codes");
const { sendSms } = require("../../utils/sendSms");
const { activityMiddleware } = require("../../middleware/activity");

const sendSmsController = async (req, res) => {
    const user = req.user;
    const { number, message, channel } = req.body;

    console.log('sms router entered')

    try {
        if (!number || !message) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Phone number and message are required",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Phone number and message are required"]
            });
        }

        // Send SMS
        let response = await sendSms(number, message, channel);

        if (response) {
            // Log activity
            await activityMiddleware(req, user.id, 'SMS sent successfully', 'SMS_SEND');

            return res.status(StatusCodes.OK).json({
                status: true,
                message: "SMS sent successfully",
                statuscode: StatusCodes.OK,
                data: null,
                errors: []
            });
        } else {
            // Log activity
            await activityMiddleware(req, user.id, 'Failed to send SMS', 'SMS_SEND_ERROR');

            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Failed to send SMS",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["Failed to send SMS"]
            });
        }
    } catch (error) {
        console.error("Error sending SMS:", error);
        await activityMiddleware(req, user.id, 'Error sending SMS', 'SMS_SEND_ERROR');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal server error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { sendSmsController };
