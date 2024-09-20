const { StatusCodes } = require("http-status-codes");
const prisma = require("../../db/prisma");
const bcrypt = require("bcryptjs");
const {isValidEmail}  = require("../../utils/isValidEmail");
const jwt = require("jsonwebtoken");
const pg = require("../../db/pg");
const { sendEmail } = require("../../utils/sendEmail");
const { calculateExpiryDate } = require("../../utils/expiredate");
const { activityMiddleware } = require("../../middleware/activity"); // Added tracker middleware
const { uploadToGoogleDrive } = require("../../utils/uploadToGoogleDrive");

const signup = async (req, res) => {
    const { firstname, lastname, email, password, phone, othernames = '', verify = false, device = '', country = '', state = '' } = req.body;
    console.log({ firstname, lastname, email, password, othernames, ema: isValidEmail(email) });
    

    // Basic validation
    if (!firstname || !lastname || !email || !password || !phone || !isValidEmail(email)) {
        let errors = [];
        if (!firstname) {
            errors.push({
                field: 'First Name',
                message: 'First name not found' 
            }); 
        }
        if (!lastname) {
            errors.push({
                field: 'Last Name',
                message: 'Last name not found'
            });
        }
        if (!email) {
            errors.push({
                field: 'Email',
                message: 'Email not found'
            });
        }
        if (!phone) {
            errors.push({
                field: 'Phone',
                message: 'Phone not found'
            });
        }
        if (!isValidEmail(email)) {
            errors.push({
                field: 'Email',
                message: 'Invalid email format'
            });
        }
        if (!password) {
            errors.push({
                field: 'Password',
                message: 'Password not found'
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
        const { rows: theuser } = await pg.query(`SELECT * FROM divine."User" WHERE email = $1`, [email]);

        // CHECKING IF ITS AN ACTIVE USER IF HE EXISTS
        if (theuser.length > 0 && theuser[0].status != 'ACTIVE') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Your account has been ${theuser[0].status}`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // WHEN THE ACCOUNT IS ALREADY IN USE
        if (theuser.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Email already in use",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Insert new user using raw query
        const { rows: [saveuser] } = await pg.query(`INSERT INTO divine."User" 
        (firstname, lastname, othernames, email, password, permissions, country, state, phone, dateadded) 
        VALUES ($1, $2, $3, $4, $5, 'NEWUSER', $6, $7, $8, $9) RETURNING id`, [firstname, lastname, othernames, email, hashedPassword, country, state, phone, new Date()]);
        const userId = saveuser.id;
        console.log(saveuser)
        const user = saveuser;

        // send welcome email
        sendEmail({
            to: email,
            subject: 'Welcome to divine Help Farmers! 🎉',
            text: 'Your journey to financial freedom begins now.',
            html: `<!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to divine Help Farmers!</title>
              </head>
              <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
                  <div style="background-color: #4CAF50; padding: 20px; text-align: center; color: #ffffff;">
                    <h1 style="margin: 0;">Welcome to divine Help Farmers! 🎉</h1>
                  </div>
                  <div style="padding: 20px;">
                    <p style="font-size: 16px; color: #333333;">Hi <strong>${firstname}</strong>,</p>
                    <p style="font-size: 16px; color: #333333;">Welcome to <strong>divine Help Farmers Multi-Purpose Cooperative Society</strong>! We're excited to have you join our cooperative on the path to <strong>financial freedom</strong>.</p>
                    <h2 style="color: #4CAF50;">What’s Next?</h2>
                    <ul style="font-size: 16px; color: #333333; padding-left: 20px;">
                      <li>Empower Your Finances: Join a community of farmers and members working together towards prosperity.</li>
                      <li>Set and Achieve Goals: Benefit from savings plans, loans, and financial growth strategies tailored for you.</li>
                      <li>Monitor Your Progress: Track your contributions, loan status, and more through detailed reports.</li>
                    </ul>
                    <h2 style="color: #4CAF50;">Get Started</h2>
                    <ol style="font-size: 16px; color: #333333; padding-left: 20px;">
                      <li><a href="#" style="color: #4CAF50; text-decoration: none;">Log in to your account</a> using the email you registered with: [User's Email].</li>
                      <li>Update your profile and financial preferences.</li>
                      <li>Start your journey towards financial empowerment with us!</li>
                    </ol>
                    <p style="font-size: 16px; color: #333333;">If you have any questions or need assistance, feel free to reach out to our support team at <a href="mailto:support@divinehelp.com" style="color: #4CAF50; text-decoration: none;">support@divinehelp.com</a>.</p>
                    <p style="font-size: 16px; color: #333333;">Thank you for choosing divine Help Farmers Cooperative. We’re here to help you reach your financial goals and achieve lasting success!</p>
                  </div>
                  <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
                    <p style="font-size: 12px; color: #666666;">&copy; 2024 divine Help Farmers Multi-Purpose Cooperative Society. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `
          });
          


        // WE WANT TO SIGN THE USER IN AUTOMATICALLY
        const token = jwt.sign({ user: userId }, process.env.JWT_SECRET, {
            expiresIn: process.env.SESSION_EXPIRATION_HOUR + 'h',
        });

        await pg.query(`INSERT INTO divine."Session" 
            (sessiontoken, userid, expires, device) 
            VALUES ($1, $2, $3, $4) 
            `, [token, userId, calculateExpiryDate(process.env.SESSION_EXPIRATION_HOUR), device])

            // RECORD THE ACTIVITY
        await activityMiddleware(res, user.id, `Registered and Logged in Successfully ${user.permissions == 'NEWUSER' ? 'and its the first login after registering' : ''} on a ${device} device`, 'AUTH')

        const { rows: [details] } = await pg.query(`SELECT * FROM divine."User" WHERE id= $1`, [userId])


        let messagestatus
        // CHECK IF THE USER HAS VALIDATED HIS EMAIL
        if (!details.emailverified && verify) {
            // create verification token
            const vtoken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: process.env.VERIFICATION_EXPIRATION_HOUR + 'h' });
            // create a verification link and code
            await pg.query(`INSERT INTO divine."VerificationToken" 
                                (identifier, token, expires) 
                                VALUES ($1, $2, $3)`, [user.id, vtoken, calculateExpiryDate(process.env.VERIFICATION_EXPIRATION_HOUR)])

            // send confirmation email
            await sendEmail({
                to: email,
                subject: 'Confirm Your Email to Begin Your Journey with divine Help Farmers Cooperative 🎉',
                text: 'Verification is key to unlocking financial freedom. Confirm your email to start your path to financial empowerment with divine Help Farmers Cooperative Society.',
                html: `<!DOCTYPE html>
                        <html>
                        <head>
                            <title>Email Verification</title>
                        </head>
                        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333333; margin: 0; padding: 0; line-height: 1.6;">
                            <div style="width: 80%; max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <div style="text-align: center; padding-bottom: 20px;">
                                <h1 style="color: #4CAF50; margin: 0; font-size: 24px;">Welcome to divine Help Farmers Cooperative Society!</h1>
                            </div>
                            <div style="margin: 20px 0;">
                                <p>Hello ${user.firstname},</p>
                                <p>Thank you for joining <strong>divine Help Farmers Multi-Purpose Cooperative Society</strong>! To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
                                <a href="${process.env.NEXT_PUBLIC_RETURN_APP_BASE}${vtoken}" style="display: block; width: 200px; margin: 20px auto; text-align: center; background-color: #4CAF50; color: #ffffff; padding: 10px; border-radius: 5px; text-decoration: none; font-weight: bold;">Verify Email Address</a>
                                <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
                                <p><a href="${process.env.NEXT_PUBLIC_RETURN_APP_BASE}${vtoken}" style="color: #4CAF50;">${process.env.NEXT_PUBLIC_RETURN_APP_BASE}${vtoken}</a></p>
                                <p>If you didn't create an account with divine Help Farmers Cooperative Society, please ignore this email.</p>
                                <p>Best Regards,<br>The divine Help Farmers Team</p>
                            </div>
                            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666666;">
                                <p>&copy; 2024 divine Help Farmers Multi-Purpose Cooperative Society. All rights reserved.</p>
                                <p>1234 Farming Lane, Prosperity City, Agriculture Nation</p>
                            </div>
                            </div>
                        </body>
                        </html>
                `
              })
              
            //   RECORD THE ACTIVITY
            await activityMiddleware(res, user.id, 'Verification Email Sent', 'AUTH')

            messagestatus = true
        }


        const responseData = {
            status: true,
            message: `Welcome ${details.firstname}`,
            statuscode: StatusCodes.OK,
            data: {
                user: {
                    ...details,
                    password: undefined
                },
                token,
                expires: calculateExpiryDate(process.env.SESSION_EXPIRATION_HOUR),
                verificationmail: messagestatus ? 'Email sent' : '',
            },
            errors: []
        };

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

module.exports = {
    signup
};