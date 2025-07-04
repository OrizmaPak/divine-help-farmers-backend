const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcrypt");
const { isValidEmail } = require("../../utils/isValidEmail");
const pg = require("../../db/pg");
const jwt = require("jsonwebtoken");
const { calculateExpiryDate } = require("../../utils/expiredate");
const { sendEmail } = require("../../utils/sendEmail");
const { authMiddleware } = require("../../middleware/authentication");
const https = require('https');

async function profile(req, res) {
    // Destructure phone and email from request params
    const { phone, email } = req.query;

    console.log('params', req.params)

    let user;

    // If phone or email is provided, search for the user in the User table
    if (phone || email) {
        try {
            const query = `SELECT * FROM divine."User" WHERE ${phone ? 'phone = $1' : 'email = $1'}`;
            const value = phone || email;
            const { rows } = await pg.query(query, [value]);

            if (rows.length > 0) {
                user = rows[0];
                console.log(user)
            } else {
                return res.status(StatusCodes.NOT_FOUND).json({
                    status: false,
                    message: "User not found.",
                    statuscode: StatusCodes.NOT_FOUND,
                    data: null,
                    errors: ["User not found with the provided phone or email."]
                });
            }
        } catch (error) {
            console.error(error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Internal Server Error",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["An error occurred while fetching the user."]
            });
        }
    } else {
        // CHECK IF USER IS AUTHENTICATED 
        user = req.user;
    }

    if (user) {
        try {
            // Fetch membership details for the user
            const membershipQuery = `
                SELECT m.*, dm.member AS membername
                FROM divine."Membership" m
                LEFT JOIN divine."DefineMember" dm ON m.member = dm.id
                WHERE m.userid = $1
            `;
            const { rows: membershipRows } = await pg.query(membershipQuery, [user.id]);

            // Add membership details to the user object
            user.membership = membershipRows.length > 0 ? membershipRows : null;

            // Fetch Paystack account details
            const paystackOptions = {
                hostname: 'api.paystack.co',
                port: 443,
                path: `/customer/${user.email}`,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            };

            const paystackReq = https.request(paystackOptions, paystackRes => {
                let data = '';

                paystackRes.on('data', (chunk) => {
                    data += chunk;
                });

                paystackRes.on('end', () => {
                    const paystackResponse = JSON.parse(data);
                    console.log('paystackResponse', paystackResponse)
                    if (paystackResponse.status) {
                        user.account_name = paystackResponse.data.dedicated_account.account_name;
                        user.account_number = paystackResponse.data.dedicated_account.account_number;
                        user.bank_name = paystackResponse.data.dedicated_account.bank.name; 
                    } else {
                        // user.paystackAccount = null;
                    }

                    return res.status(StatusCodes.OK).json({
                        status: true, 
                        message: "Profile fetched successfully.",
                        statuscode: StatusCodes.OK,
                        data: user,
                        errors: []
                    });
                });
            }).on('error', error => {
                console.error(error);
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: false,
                    message: "Internal Server Error",
                    statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                    data: null,
                    errors: ["An error occurred while fetching the Paystack account details."]
                });
            });

            paystackReq.end();
        } catch (error) {
            console.error(error);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Internal Server Error",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ["An error occurred while fetching the membership details."]
            });
        }
    }
}

module.exports = { profile }