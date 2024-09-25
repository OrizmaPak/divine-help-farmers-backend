const { StatusCodes } = require("http-status-codes"); // Import StatusCodes for HTTP status codes
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware for activity tracking
const pg = require("../../../db/pg"); // Import PostgreSQL database connection

// Function to handle UPDATE inventory request
const updateRequisitionStatus = async (req, res) => {

    const user = req.user

    // Extract status from request
    let status = req.body.status;
    const reference = req.body.reference;

    // Check if the status is either APPROVED or DECLINED and if reference is sent
    if (status !== 'APPROVED' && status !== 'DECLINED' || !reference) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid status or missing reference",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    // If the status is APPROVED, change it to ACTIVE
    if (status === 'APPROVED') {
        status = 'ACTIVE';
    }

    // Update the status of the requisition
    try {
        await pg.query(`UPDATE divine."Inventory" SET status = $1 WHERE "reference" = $2`, [status, reference]);
        await activityMiddleware(req, user.id, 'Requisition status updated successfully', 'INVENTORY'); // Tracker middleware
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Requisition status updated successfully",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (err) {
        console.error('Unexpected Error:', err);
        await activityMiddleware(req, user.id, 'An unexpected error occurred updating requisition status', 'INVENTORY'); // Tracker middleware
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: []
        });
    }
}

module.exports = {
    updateRequisitionStatus
};

