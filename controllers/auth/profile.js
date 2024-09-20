const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcrypt");
const { isValidEmail } = require("../../utils/isValidEmail");
const pg = require("../../db/pg");
const jwt = require("jsonwebtoken");
const { calculateExpiryDate } = require("../../utils/expiredate");
const { sendEmail } = require("../../utils/sendEmail");
const { authMiddleware } = require("../../middleware/authentication");

async function profile(req, res) {
    // CHECK IF USER IS AUTHENTICATED
    const user = req.user
    console.log(user)
    if(user){
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Profile fetched successfully.",
            statuscode: StatusCodes.OK,
            data: user,
            errors: []
        });
    }
}

module.exports = { profile }