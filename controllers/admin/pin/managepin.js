const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const pg = require("../../../db/pg");

const managePin = async (req, res) => {
    const { id, pin } = req.body;

    if (!pin) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Pin is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    try {
        // Encrypt the pin using JWT_SECRET
        const encryptedPin = jwt.sign({ pin }, process.env.JWT_SECRET);

        // Update the User with the new encrypted pin
        const updateQuery = {
            text: `UPDATE divine."User" SET pin = $1 WHERE id = $2`,
            values: [encryptedPin, id]
        };
        await pg.query(updateQuery);

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Pin updated successfully",
            statuscode: StatusCodes.OK,
            data: { encryptedPin },
            errors: []
        });
    } catch (error) {
        console.error("Error processing pin:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal server error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { managePin };
