const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware

const definepositionbymembership = async (req, res) => {
    const { id="", member, position, status="" } = req.body;
    
    const user = req.user

    // Basic validation
    if (!member && !id || !position) {
        let errors = [];
        if (!member) {
            errors.push({
                field: 'Member Name',
                message: 'Member name not found' 
            }); 
        }
        if (!position) {
            errors.push({
                field: 'Position Name',
                message: 'Position name not found' 
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
        if(!id){
            // Check if member exists using raw query
            const { rows: themember } = await pg.query(`SELECT * FROM divine."DefineMember" WHERE id = $1`, [member]);

            // WHEN THE ACCOUNT IS ALREADY IN USE
            if (themember.length == 0) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Membership cannot be found",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }

            // Check if position already exists for the member using raw query
            const { rows: thepositions } = await pg.query(`SELECT * FROM divine."Position" WHERE member = $1`, [member]);

            // WHEN THE ACCOUNT IS ALREADY IN USE
            let positionAlreadyExists = false;
            for (const pos of thepositions) {
                if (pos.position === position) {
                    positionAlreadyExists = true;
                    break;
                }
            }
            if (positionAlreadyExists) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Position already exist for this member",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null, 
                    errors: []
                });
            }
            
        }

        // DEFINE QUERY
        let query;

        if (id) {
            if(id && status){
                query = await pg.query(`UPDATE divine."Position" SET 
                    status = $1,
                    lastupdated = $2
                    WHERE id = $3`, [status, new Date(), id]);
            }else{
                query = await pg.query(`UPDATE divine."Position" SET 
                    member = $1, 
                    position = $2, 
                    lastupdated = $3,
                    WHERE id = $4`, [member, position, new Date(), id]);
            }
        } else {
            query = await pg.query(`INSERT INTO divine."Position" 
                (member, position, createdby) 
                VALUES ($1, $2, $3)`, [member, position, user.id]);
        }

        // NOW SAVE THE BRANCH
        const { rowCount: savebranch } = query

        // RECORD THE ACTIVITY
        await activityMiddleware(req, user.id, `${position} Position ${!id ? 'created' : 'updated'}`, 'POSITION');

        const responseData = {
            status: true,
            message: `${position} successfully ${!id ? 'created' : 'updated'}`,
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
    definepositionbymembership
};