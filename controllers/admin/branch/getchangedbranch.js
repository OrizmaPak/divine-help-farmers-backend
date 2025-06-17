const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const getChangedBranch = async (req, res) => {
    const user = req.user;

    try {
        let query = {
            text: `
                SELECT 
                    bc.*, 
                    CONCAT(u.firstname, ' ', u.lastname, ' ', COALESCE(u.othernames, '')) AS fullname,
                    cb.branch AS current_branch,
                    pb.branch AS previous_branch
                FROM divine."branchchanged" bc
                JOIN divine."User" u ON bc.userid = u.id
                LEFT JOIN divine."Branch" cb ON bc.branch::text = cb.id::text
                LEFT JOIN divine."Branch" pb ON bc.previousbranch::text = pb.id::text
            `,
            values: []
        };

        // Dynamically build the WHERE clause based on query parameters for date range
        let whereClause = '';
        let valueIndex = 1;

        if (req.query.startdate) {
            whereClause += ` WHERE bc."dateadded" >= $${valueIndex}`;
            query.values.push(new Date(req.query.startdate)); 
            valueIndex++;
        }

        if (req.query.enddate) {
            if (whereClause) {
                whereClause += ` AND `;
            } else {
                whereClause += ` WHERE `;
            }
            whereClause += `bc."dateadded" <= $${valueIndex}`;
            query.values.push(new Date(req.query.enddate));
            valueIndex++;
        }

        query.text += whereClause;

        const result = await pg.query(query);
        const changedBranches = result.rows;

        await activityMiddleware(req, user.id, 'Changed branches fetched successfully', 'BRANCH');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Changed branches fetched successfully",
            statuscode: StatusCodes.OK,
            data: changedBranches,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching changed branches', 'BRANCH');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getChangedBranch };