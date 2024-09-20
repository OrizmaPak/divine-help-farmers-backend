const { StatusCodes } = require("http-status-codes"); // Import StatusCodes for HTTP status codes
const pg = require("../../../db/pg"); // Import PostgreSQL database connection
const { activityMiddleware } = require("../../../middleware/activity"); // Import activity middleware for tracking

// Function to handle GET request for registration points
const getRegistrationPoint = async (req, res) => {
    // Extract branch and status from query parameters with default status as 'ACTIVE'
    let { branch, status="ACTIVE" } = req.query;

    // If branch is not provided, use the branch from the authenticated user
    if(!branch){
        branch = req.user.branch
    }

    // Basic validation to check if branch is a number
    if (branch && isNaN(branch)) {
        let errors = [];
        errors.push({
            field: 'Branch',
            message: 'Branch must be a number'
        });

        // Return error response if branch is not a number
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid Field",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: errors
        });
    }

    try {
        // Base query to select all registration points
        let queryString = `SELECT * FROM divine."Registrationpoint" WHERE 1=1`;
        let params = [];

        // Add branch condition to the query if branch is provided
        if (branch) {
            queryString += ` AND branch = $${params.length + 1}`;
            params.push(branch);
        }
        // Add status condition to the query if status is provided
        if (status) {
            queryString += ` AND status = $${params.length + 1}`;
            params.push(status);
        }

        // Execute the query with parameters
        const { rows: registrationPoints } = await pg.query(queryString, params);

        // Check if any registration points are found
        if (registrationPoints.length > 0) {
            // Log activity if registration points are found
            await activityMiddleware(req, req.user.id, 'Registration points fetched successfully', 'REGISTRATIONPOINT');
            // Return success response with registration points
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Registration points fetched successfully",
                statuscode: StatusCodes.OK,
                data: registrationPoints,
                errors: []
            });
        } else {
            // Log activity if no registration points are found
            await activityMiddleware(req, req.user.id, 'No registration points found for the branch', 'REGISTRATIONPOINT');
            // Return success response with no data
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No registration points found for the branch",
                statuscode: StatusCodes.OK,
                data: [],
                errors: []
            });
        }
    } catch (err) {
        console.error('Unexpected Error:', err); // Log any unexpected error
        // Log activity for unexpected error
        await activityMiddleware(req, req.user.id, 'An unexpected error occurred fetching registration points', 'REGISTRATIONPOINT');
        // Return error response for unexpected error
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
    getRegistrationPoint
};

