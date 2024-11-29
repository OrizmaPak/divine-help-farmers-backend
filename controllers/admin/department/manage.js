const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware

// Function to define a department
const defineDepartment = async (req, res) => {
    const { id="", department, branch, userid, status="" } = req.body;
    
    const user = req.user

    // Basic validation
    if (!department || !branch) {
        let errors = [];
        if (!department) {
            errors.push({
                field: 'Department Name',
                message: 'Department name not found' 
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

    try {
         // Check if department exists for the branch or if another department in the branch has the name
        const { rows: thedepartment } = await pg.query(
            `SELECT * FROM divine."Department" 
            WHERE (department = $1 AND branch = $2) 
            OR (branch = $2 AND department = $1 AND (id != $3 OR $3 = '0'))`, 
            [department, branch, id === '' ? '0' : id]
        );

        // WHEN THE DEPARTMENT ALREADY EXISTS OR ANOTHER DEPARTMENT IN THE BRANCH HAS THE NAME
        if (thedepartment.length > 0 && !id) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Department already exists for this branch or another department in the branch has the name",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }


        // DEFINE QUERY
        let query;

        if (id) {
            if(id && status){
                // Update the department status
                query = await pg.query(`UPDATE divine."Department" SET 
                    status = $1,
                    lastupdated = $2,
                    userid = $3
                    WHERE id = $4`, [status, new Date(), userid, id]);
            }else{
                // Update the department details
                query = await pg.query(`UPDATE divine."Department" SET 
                    department = $1, 
                    branch = $2, 
                    lastupdated = $3,
                    userid = $4
                    WHERE id = $5`, [department, branch, new Date(), userid, id]);
            }
        } else {
            // Insert a new department
            query = await pg.query(`INSERT INTO divine."Department" 
                (department, branch, createdby, userid) 
                VALUES ($1, $2, $3, $4)`, [department, branch, user.id, userid]);
        }

        // NOW SAVE THE DEPARTMENT
        const { rowCount: savedepartment } = query

        // Prepare the response data
        const responseData = {
            status: true,
            message: `${department} successfully ${!id ? 'created' : 'updated'}`,
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        };

        // Return the response
        if(savedepartment > 0) {
            // TRACK THE ACTIVITY
            await activityMiddleware(req, user.id, `${department} Department ${!id ? 'created' : 'updated'}`, 'DEPARTMENT');
            return res.status(StatusCodes.OK).json(responseData);
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
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
    defineDepartment
};