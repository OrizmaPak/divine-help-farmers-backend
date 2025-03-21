const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcrypt");
const { isValidEmail } = require("../../utils/isValidEmail");
const pg = require("../../db/pg");
const jwt = require("jsonwebtoken");
const { calculateExpiryDate } = require("../../utils/expiredate");
const { sendEmail } = require("../../utils/sendEmail");
const { activityMiddleware } = require("../../middleware/activity"); // Added tracker middleware

async function sendverificationmail(req, res) {
    const { email } = req.body;
    console.log({ email });

    // Basic validation
    if (!email || !isValidEmail(email)) {
        let errors = [];
        if (!email) {
            errors.push({
                field: 'Email',
                message: 'Email not found'
            });
        }
        if (!isValidEmail(email)) {
            errors.push({
                field: 'Email',
                message: 'Invalid email format'
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
        // Check if email already exists using raw query
        const { rows: [existingUser] } = await pg.query(`SELECT * FROM divine."User" WHERE email = $1`, [email]);

        if (!existingUser) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Email provided is not a registered address",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }


        let messagestatus;
        // CHECK IF THE USER HAS VALIDATED HIS EMAIL
        if (!existingUser.emailverified) {
            // create verification token
            const vtoken = jwt.sign({ email, id: existingUser.id }, process.env.JWT_SECRET, { expiresIn: process.env.VERIFICATION_EXPIRATION_HOUR + 'h' });
            // create a verification link and code
            await pg.query(`INSERT INTO divine."VerificationToken"   
                (identifier, token, expires) 
                VALUES ($1, $2, $3)`,
                [existingUser.id, vtoken, calculateExpiryDate(process.env.VERIFICATION_EXPIRATION_HOUR)])

            // send confirmation email
            await sendEmail(
                {
                    to: email,
                    subject: 'Confirm Your Email to Begin Your Divine Help Farmers Journey 🌾',
                    text: 'Verification is the key to unlocking your journey. Confirm your email to start your path to smarter farming practices with Divine Help Farmers.',
                    html: `<!DOCTYPE html>
                        <html>
                        <head>
                            <title>Email Verification</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333333; margin: 0; padding: 0; line-height: 1.6;">
                            <div style="width: 80%; max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <div style="text-align: center; padding-bottom: 20px;">
                                <h1 style="color: #4CAF50; margin: 0; font-size: 24px;">Welcome to Divine Help Farmers!</h1>
                            </div>
                            <div style="margin: 20px 0;">
                                <p>Hello ${existingUser.firstname},</p>
                                <p>Thank you for registering with Divine Help Farmers! To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
                                <a href="https://frontend.dhfdev.online?emailtoken=${vtoken}" style="display: block; width: 200px; margin: 20px auto; text-align: center; background-color: #4CAF50; color: #ffffff; padding: 10px; border-radius: 5px; text-decoration: none; font-weight: bold;">Verify Email Address</a>
                                <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
                                <p><a href="https://frontend.dhfdev.online?emailtoken=${vtoken}" style="color: #4CAF50;">https://frontend.dhfdev.online?emailtoken=${vtoken}</a></p>
                                <p>If you didn't create an account with Divine Help Farmers, please ignore this email.</p>
                                <p>Best Regards,<br>The Divine Help Farmers Team</p>
                            </div>
                            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666666;">
                                <p>&copy; 2024 Divine Help Farmers. All rights reserved.</p>
                                <p>1234 Farm Lane, Harvest City, Agriculture Country</p>
                            </div>
                            </div>
                        </body>
                        </html>
                        
                        `
                }
            )
            messagestatus = true;
        }

        // verification_token: vtoken,
        // expires: calculateExpiryDate(process.env.VERIFICATION_EXPIRATION_HOUR),
        const responseData = {
            status: true,
            message: `Email sent to ${email}`,
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        };

        // TRACK THE ACTIVITY
        await activityMiddleware(req, existingUser.id, 'Email Verification Sent', 'AUTH');

        return res.status(StatusCodes.OK).json(responseData);

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

module.exports = { sendverificationmail }