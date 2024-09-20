const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware

const definemembership = async (req, res) => {
    const { id="", member, status="" } = req.body;
    
    const user = req.user

    // Basic validation
    if (!member ) {
        let errors = [];
        if (!member) {
            errors.push({
                field: 'Member Name',
                message: 'Member name not found' 
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
        if(!id){// Check if branch already exists using raw query
            const { rows: themember } = await pg.query(`SELECT * FROM divine."DefineMember" WHERE member = $1`, [member]);

            // WHEN THE ACCOUNT IS ALREADY IN USE
            if (themember.length > 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Membership name already exist",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        }

        // DEFINE QUERY
        let query;

        if (id) {
            if(status){
                query = await pg.query(`UPDATE divine."DefineMember" SET 
                    status = $1,
                    lastupdated = $2
                    WHERE id = $3`, [status, new Date(), id]);
            }else{
                query = await pg.query(`UPDATE divine."DefineMember" SET 
                    member = $1, 
                    lastupdated = $2
                    WHERE id = $3`, [member, new Date(), id]);
            }
        } else {
            query = await pg.query(`INSERT INTO divine."DefineMember" 
                (member, createdby) 
                VALUES ($1, $2)`, [member, user.id]);
        }

        // NOW SAVE THE BRANCH
        const { rowCount: savebranch } = query

            // RECORD THE ACTIVITY
        await activityMiddleware(req, user.id, `${member} Membership ${!id ? 'created' : 'updated'}`, 'MEMBERSHIP');

        const responseData = {
            status: true,
            message: `${member} successfully ${!id ? 'created' : 'updated'}`,
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        };

        if(savebranch > 0)return res.status(StatusCodes.OK).json(responseData);
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
    definemembership
};