const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware

const manageRegistrationPoint = async (req, res) => {
    const { id="", registrationpoint, branch, status } = req.body;

    // Basic validation
    if (!registrationpoint || !branch) {
        let errors = [];
        if (!registrationpoint) {
            errors.push({
                field: 'Registration Point',
                message: 'Registration point not found' 
            }); 
        }
        if (!branch) {
            errors.push({
                field: 'Branch',
                message: 'Branch not found'
            });
        }

        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Missing Fields",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: errors
        });
    }

    const branchExists = await pg.query(`SELECT * FROM divine."Branch" WHERE id = $1`, [branch]);
    if (branchExists.rowCount === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Branch does not exist",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    } 

    try {
        if (!id) { // Create new registration point
            // Check if registration point already exists for the branch
            const registrationPointExists = await pg.query(`SELECT * FROM divine."Registrationpoint" WHERE registrationpoint = $1 AND branch = $2`, [registrationpoint, branch]);
            if (registrationPointExists.rowCount > 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Registration point already exists for this branch",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }

            const { rows: [newRegistrationPoint] } = await pg.query(`
                INSERT INTO divine."Registrationpoint" (registrationpoint, branch, datecreated, createdby)
                VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
                RETURNING *
            `, [registrationpoint, branch, req.user.id]);

            await activityMiddleware(req, req.user.id, `Registration point created successfully in ${branchExists.rows[0].branch}`, 'REGISTRATIONPOINT'); // Tracker middleware
            return res.status(StatusCodes.CREATED).json({
                status: true,
                message: "Registration point created successfully",
                statuscode: StatusCodes.CREATED,
                data: newRegistrationPoint,
                errors: []
            });
        } else { // Update existing registration point
            if (status) { // Update only the status if provided
                const { rows: [updatedRegistrationPoint] } = await pg.query(`
                    UPDATE divine."Registrationpoint"
                    SET status = $1
                    WHERE id = $2
                    RETURNING *
                `, [status, id]);

                if (!updatedRegistrationPoint) {
                    return res.status(StatusCodes.NOT_FOUND).json({
                        status: false,
                        message: "Registration point not found",
                        statuscode: StatusCodes.NOT_FOUND,
                        data: null,
                        errors: []
                    });
                }

                await activityMiddleware(req, req.user.id, `Registration point status updated successfully in ${branchExists.rows[0].branch}`, 'REGISTRATIONPOINT'); // Tracker middleware
                return res.status(StatusCodes.OK).json({
                    status: true,
                    message: "Registration point status updated successfully",
                    statuscode: StatusCodes.OK,
                    data: updatedRegistrationPoint,
                    errors: []
                });
            } else { // If status is not true, update the registration point
                const { rows: [updatedRegistrationPoint] } = await pg.query(`
                    UPDATE divine."Registrationpoint"
                    SET registrationpoint = $1,
                    branch = $2
                    WHERE id = $3
                    RETURNING *
                `, [registrationpoint, branch, id]);

                if (!updatedRegistrationPoint) {
                    return res.status(StatusCodes.NOT_FOUND).json({
                        status: false,
                        message: "Registration point not found",
                        statuscode: StatusCodes.NOT_FOUND,
                        data: null,
                        errors: []
                    });
                }

                await activityMiddleware(req, req.user.id, `Registration point status updated successfully in ${branchExists.rows[0].branch}`, 'REGISTRATIONPOINT'); // Tracker middleware
                return res.status(StatusCodes.OK).json({
                    status: true,
                    message: "Registration point status updated successfully",
                    statuscode: StatusCodes.OK,
                    data: updatedRegistrationPoint,
                    errors: []
                });
            }
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
        await activityMiddleware(req, req.user.id, `An unexpected error occurred managing registration point in ${branchExists.rows[0].branch}`, 'REGISTRATIONPOINT'); // Tracker middleware
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
    manageRegistrationPoint
};

