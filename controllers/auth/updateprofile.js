const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcrypt");
const { isValidEmail } = require("../../utils/isValidEmail");
const pg = require("../../db/pg");
const jwt = require("jsonwebtoken");
const { calculateExpiryDate, isPastDate } = require("../../utils/expiredate");
const { sendEmail } = require("../../utils/sendEmail");
const { authMiddleware } = require("../../middleware/authentication");
const { activityMiddleware } = require("../../middleware/activity"); // Added tracker middleware

  
async function updateuser(req, res) {

    const { _userid='', firstname, lastname, othernames, image, country, state, role, status, address, branch } = req.body;

    // CHECK IF USER IS AUTHENTICATED
    const user = req.user
    // DECLARE THE USER OPERATED ON
    let userid;

    if(req.user.role == 'USERADMIN' && _userid){
        userid = _userid;
    }else{
        userid = user.id
    }

    try{

            // THIS MEANS THE USER WANTS TO UPDATE
            if(status){
                await pg.query(`UPDATE divine."User" 
                                 SET status = $1, 
                                 lastupdated = $2
                                 WHERE id = $3`, [status, new Date(), userid]);
            }else{
                await pg.query(`UPDATE divine."User" 
                                 SET firstname = COALESCE($1, firstname), 
                                     lastname = COALESCE($2, lastname), 
                                     othernames = COALESCE($3, othernames), 
                                     image = CASE WHEN $4::TEXT = '' THEN image ELSE $4::TEXT END,
                                     role = COALESCE($5, role),
                                     lastupdated = COALESCE($6, lastupdated),
                                     state = COALESCE($7, state),
                                     country = COALESCE($8, country),
                                     address = COALESCE($9, address),
                                     branch = COALESCE($10, branch) 
                             WHERE id = $11`, [firstname, lastname, othernames, image, role, new Date(), state, country, address, branch, userid]);
            }
            // TRACK ACTIVITY
            const activity = activityMiddleware(req, user.id, `Updated Profile`, 'AUTH');
            
            // INFORM THE USER 
            return res.status(StatusCodes.OK).json({
                status: true,
                message: 'Profile Update Successful',
                statuscode: StatusCodes.OK,
                data: null,
                errors: []
            });

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


module.exports = {updateuser}