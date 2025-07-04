const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware

const createbranch = async (req, res) => {
    const { id="", branch, country, state, lga, address='', status="", userid, unitno=0, meetingfrequency="", registrationfee=0 } = req.body;
    console.log({ branch, country, state, address, unitno, meetingfrequency, registrationfee });

    const user = req.user;
    
    // Basic validation
    if (!id && !status) {
        let errors = [];
        if (!branch) {
            errors.push({
                field: 'Branch Name',
                message: 'Branch name not found'
            });
        }
        // if (!country) {
        //     errors.push({
        //         field: 'Country', 
        //         message: 'Country not found'
        //     });
        // }
        // if (!state) {
        //     errors.push({
        //         field: 'State',
        //         message: 'State not found'
        //     });
        // }
        // if (!lga) {
        //     errors.push({
        //         field: 'lga',
        //         message: 'Local Government Area not found'
        //     });
        // }
        // if (!userid) {
        //     errors.push({
        //         field: 'User ID',
        //         message: 'User ID not found'
        //     });
        // }

        if (errors.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Missing Fields",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: errors
            });
        }
    }

    try {
        // Validate if user exists
        // const { rows: userExists } = await pg.query(`SELECT * FROM divine."User" WHERE id = $1`, [userid]);
        // if (userExists.length === 0) {
        //     return res.status(StatusCodes.BAD_REQUEST).json({
        //         status: false,
        //         message: "User does not exist",
        //         statuscode: StatusCodes.BAD_REQUEST,
        //         data: null,
        //         errors: []
        //     });
        // }

        if (!id) { // Check if branch already exists using raw query
            const { rows: thebranch } = await pg.query(`SELECT * FROM divine."Branch" WHERE branch = $1`, [branch]);

            // WHEN THE ACCOUNT IS ALREADY IN USE
            if (thebranch.length > 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Branch already exist",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        }

        // DEFINE QUERY
        let query;

        if (id) {
            if (status) {
                query = await pg.query(`UPDATE divine."Branch" SET 
                    status = $1,
                    lastupdated = $2
                    WHERE id = $3`, [status, new Date(), id]);
            } else {
                query = await pg.query(`UPDATE divine."Branch" SET 
                    branch = $1, 
                    country = $2, 
                    state = $3, 
                    address = $4, 
                    lga = $5, 
                    unitno = $6,
                    meetingfrequency = $7,
                    registrationfee = $8,
                    lastupdated = $9,
                    userid = $10
                    WHERE id = $11`, [branch, country, state, address, lga, unitno, meetingfrequency, registrationfee, new Date(), userid??null, id]);
            }
        } else {
            query = await pg.query(`INSERT INTO divine."Branch" 
                (branch, country, state, address, lga, unitno, meetingfrequency, registrationfee, createdby, userid) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [branch, country, state, address, lga, unitno, meetingfrequency, registrationfee, user.id, userid]);
        }

        // NOW SAVE THE BRANCH
        const { rowCount: savebranch } = query;
 
        // RECORD THE ACTIVITY
        await activityMiddleware(res, user.id, `${branch} Branch ${!id ? 'created' : 'updated'}`, 'BRANCH');

        const responseData = {
            status: true,
            message: `${branch} Branch successfully ${!id ? 'created' : 'updated'}`,
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        };

        if (savebranch > 0) return res.status(StatusCodes.OK).json(responseData);
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
    createbranch
};