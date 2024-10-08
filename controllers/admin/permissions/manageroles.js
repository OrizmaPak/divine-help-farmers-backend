const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

async function manageroles(req, res) {
    const { role, permissions, description, status } = req.body;

    if(role == 'CUSTOM' || role == 'custom'){
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Role name custom is not allowed",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }
    if(role == 'SUPERADMIN' || role == 'superadmin'){
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Role name superadmin is not allowed",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    const user = req.user

    try {
        // Check if the role already exists
        const { rows: existingRoles } = await pg.query(`SELECT * FROM divine."Roles" WHERE role = $1`, [role]);

        if (existingRoles.length > 0) {
            // If the role exists, update it
            if (status && status !== 'ACTIVE') {
                // If the status is not ACTIVE, update only the status
                await pg.query(`UPDATE divine."Roles" SET status = $1 WHERE role = $2`, [status, role]);
                await pg.query(`UPDATE divine."User" SET permissions = $1 WHERE role = $2`, [role, role]);
                await activityMiddleware(req, user.id, `Role ${role} status updated successfully`);
            }else if (status && status == 'ACTIVE') {
                // If the status is not ACTIVE, update only the status
                await pg.query(`UPDATE divine."Roles" SET status = $1 WHERE role = $2`, [status, role]);
                await pg.query(`UPDATE divine."User" SET permissions = $1 WHERE role = $2`, [permission, role]);
                await activityMiddleware(req, user.id, `Role ${role} status updated successfully`);
            }else {
                // If the status is ACTIVE, update the role and give all users with the role the permission of the role
                await pg.query(`UPDATE divine."Roles" SET permissions = $1, description = $2 WHERE role = $3`, [permissions, description, role]);
                await pg.query(`UPDATE divine."User" SET permissions = $1 WHERE role = $2`, [permissions, role]);
                await activityMiddleware(req, user.id, `Role ${role} updated successfully and permissions updated for users with role ${role}`);
            }
        } else {
            // If the role does not exist, create it
            await pg.query(`INSERT INTO divine."Roles" (role, permissions, description) VALUES ($1, $2, $3)`, [role, permissions, description]);
            await activityMiddleware(req, user.id, `Role ${role} created successfully`);
        }

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Role created/updated successfully",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: []
        });
    }
}

module.exports = { manageroles };
