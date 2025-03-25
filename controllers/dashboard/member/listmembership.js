const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const listMemberships = async (req, res) => {
    
    if (req.query.userid) {
        const userQuery = {
            text: `SELECT * FROM divine."User" WHERE id = $1`,
            values: [req.query.userid]
        };
        const { rows: [userData] } = await pg.query(userQuery);

        if (!userData) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "User not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: ["User with the provided ID does not exist"]
            });
        }

        req.user = userData;
    }

    const user = req.user;

    try {
        const query = {
            text: `
                SELECT m.*, dm.member AS membername 
                FROM divine."Membership" m
                JOIN divine."DefineMember" dm ON m.member = dm.id
                WHERE m.userid = $1
            `,
            values: [user.id]
        };

        const result = await pg.query(query);
        const memberships = result.rows;

        await activityMiddleware(req, user.id, 'Memberships fetched successfully', 'MEMBERSHIP');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Memberships fetched successfully",
            statuscode: StatusCodes.OK,
            data: memberships,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching memberships', 'MEMBERSHIP');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { listMemberships };
