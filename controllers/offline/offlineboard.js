const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");
const { generateOfllineCode } = require("../../utils/generateid");

const getDailyCodeAndPin = async (req, res) => {
    try {
        // Extract user details from request
        const { id, phone, branch, registrationpoint } = req.user;

        if (!id || !phone || !branch || !registrationpoint) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "User ID, phone, branch, and registration point are required",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Generate daily code and pin
        const dailyCode = generateOfllineCode(id, phone, branch, registrationpoint);
        const pin = parseInt(dailyCode.replaceAll('-', ''));

        // Respond with the generated code and pin
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Daily code and pin generated successfully",
            statuscode: StatusCodes.OK,
            data: {
                dailyCode,
                pin
            },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getDailyCodeAndPin };
