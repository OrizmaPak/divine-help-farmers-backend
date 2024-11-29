const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcrypt");
const { isValidEmail } = require("../../utils/isValidEmail");
const pg = require("../../db/pg");
const jwt = require("jsonwebtoken");
const { calculateExpiryDate, isPastDate } = require("../../utils/expiredate");
const { sendEmail } = require("../../utils/sendEmail");
const { authMiddleware } = require("../../middleware/authentication");
const { activityMiddleware } = require("../../middleware/activity"); // Added tracker middleware
const { uploadToGoogleDrive } = require("../../utils/uploadToGoogleDrive");

  
async function updateuser(req, res) {

    if (req.files) {
        await uploadToGoogleDrive(req, res);
      }
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

    console.log('req.body', req.body)

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
                                     image = COALESCE(NULLIF($4, ''), image),
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
            // RETURN THE UPDATED PROFILE
            const updatedUser = await pg.query(`SELECT * FROM divine."User" WHERE id = $1`, [userid]);
            return res.status(StatusCodes.OK).json({
                status: true,
                message: 'Profile Update Successful',
                statuscode: StatusCodes.OK,
                data: updatedUser.rows[0],
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