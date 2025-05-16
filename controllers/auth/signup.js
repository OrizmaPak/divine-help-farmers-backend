const { StatusCodes } = require("http-status-codes");
const prisma = require("../../db/prisma");
const bcrypt = require("bcryptjs");
const { isValidEmail } = require("../../utils/isValidEmail");
const jwt = require("jsonwebtoken");
const pg = require("../../db/pg");
const { sendEmail } = require("../../utils/sendEmail");
const { calculateExpiryDate } = require("../../utils/expiredate");
const { activityMiddleware } = require("../../middleware/activity");
const { uploadToGoogleDrive } = require("../../utils/uploadToGoogleDrive");
const { autoAddMembershipAndAccounts } = require("../../middleware/autoaddmembershipandaccounts");
const https = require('https');
const { manageSavingsAccount } = require("../savings/createaccount/createaccount");

const signup = async (req, res) => {
    // Destructure and extract user details from the request body
    const { firstname, lastname, branch, email, password, phone, othernames = '', verify = false, device = '', country = '', state = '' } = req.body;
    console.log({ firstname, lastname, email, password, othernames, ema: isValidEmail(email) });

    // Basic validation to check for missing or invalid fields
    if (!firstname || !lastname || !email || !password || !phone || !isValidEmail(email) || !branch) {
        let errors = [];
        // Collect errors for each missing or invalid field
        if (!firstname) {
            errors.push({ field: 'First Name', message: 'First name not found' });
        }
        if (!branch) {
            errors.push({ field: 'Branch', message: 'Branch not found' });
        }
        if (!lastname) {
            errors.push({ field: 'Last Name', message: 'Last name not found' });
        }
        if (!email) {
            errors.push({ field: 'Email', message: 'Email not found' });
        }
        if (!phone) {
            errors.push({ field: 'Phone', message: 'Phone not found' });
        }
        if (!isValidEmail(email)) {
            errors.push({ field: 'Email', message: 'Invalid email format' });
        }
        if (!password) {
            errors.push({ field: 'Password', message: 'Password not found' });
        }

        // Return a response with the list of errors if validation fails
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Missing Fields",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: errors
        });
    }

    try {
        // Query to check if the branch exists in the database
        const branchExistsQuery = `SELECT * FROM divine."Branch" WHERE id = $1`;
        const { rows: branchExistsResult } = await pg.query(branchExistsQuery, [branch]);

        // If the branch does not exist, return an error response
        if (branchExistsResult.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Branch does not exist.",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Branch does not exist."]
            });
        }

        // Query to check if the email already exists in the database
        const { rows: theuser } = await pg.query(`SELECT * FROM divine."User" WHERE email = $1`, [email]);

        // Query to check if the phone number already exists in the database
        const { rows: phoneUser } = await pg.query(`SELECT * FROM divine."User" WHERE phone = $1`, [phone]);

        // Check if the user exists but is not active
        if (theuser.length > 0 && theuser[0].status != 'ACTIVE') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Your account has been ${theuser[0].status}`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // If the email is already in use, return an error response
        if (theuser.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Email already in use",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // If the phone number is already in use, return an error response
        if (phoneUser.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Phone number already in use",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Hash the user's password for security
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert the new user into the database
        const { rows: [saveuser] } = await pg.query(`INSERT INTO divine."User" 
        (firstname, lastname, othernames, email, password, permissions, country, state, phone, dateadded) 
        VALUES ($1, $2, $3, $4, $5, 'NEWUSER', $6, $7, $8, $9) RETURNING id`, [firstname, lastname, othernames, email, hashedPassword, country, state, phone, new Date()]);
        
        const userId = saveuser.id;
        console.log(saveuser)
        const user = saveuser;

        // Send a welcome email to the new user
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

        // Check if the user already exists in Paystack
        const checkUserOptions = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/customer/${email}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const checkUserReq = https.request(checkUserOptions, checkUserRes => {
            let data = '';

            checkUserRes.on('data', (chunk) => {
                data += chunk;
            });

            checkUserRes.on('end', () => {
                const paystackResponse = JSON.parse(data);
                if (!paystackResponse.status) {
                    // If the user does not exist in Paystack, create the user
                    const createUserParams = JSON.stringify({
                        "email": email,
                        "first_name": firstname,
                        "last_name": lastname,
                        "phone": phone
                    });

                    const createUserOptions = {
                        hostname: 'api.paystack.co',
                        port: 443,
                        path: '/customer',
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    };

                    const createUserReq = https.request(createUserOptions, createUserRes => {
                        let createUserData = '';

                        createUserRes.on('data', (chunk) => {
                            createUserData += chunk;
                        });

                        createUserRes.on('end', () => {
                            console.log(JSON.parse(createUserData));
                        });
                    }).on('error', error => {
                        console.error(error);
                    });

                    createUserReq.write(createUserParams);
                    createUserReq.end();
                }
            });
        }).on('error', error => {
            console.error(error);
        });

        checkUserReq.end();

        // Automatically sign the user in by generating a JWT token
        const token = jwt.sign({ user: userId }, process.env.JWT_SECRET, {
            expiresIn: process.env.SESSION_EXPIRATION_HOUR + 'h',
        });

        // Insert the session details into the database
        await pg.query(`INSERT INTO divine."Session" 
            (sessiontoken, userid, expires, device) 
            VALUES ($1, $2, $3, $4) 
            `, [token, userId, calculateExpiryDate(process.env.SESSION_EXPIRATION_HOUR), device]);

        // Record the user's activity
        await activityMiddleware(res, user.id, `Registered and Logged in Successfully ${user.permissions == 'NEWUSER' ? 'and its the first login after registering' : ''} on a ${device} device`, 'AUTH')

        // Retrieve the user's details from the database
        const { rows: [details] } = await pg.query(`SELECT * FROM divine."User" WHERE id= $1`, [userId])

        let messagestatus;
        // Check if the user's email is verified
        if (!details.emailverified && verify) {
            // Create a verification token
            const vtoken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: process.env.VERIFICATION_EXPIRATION_HOUR + 'h' });
            // Insert the verification token into the database
            await pg.query(`INSERT INTO divine."VerificationToken" 
                                (identifier, token, expires) 
                                VALUES ($1, $2, $3)`, [user.id, vtoken, calculateExpiryDate(process.env.VERIFICATION_EXPIRATION_HOUR)])

            // Send a confirmation email to the user
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

            // Record the activity of sending a verification email
            await activityMiddleware(res, user.id, 'Verification Email Sent', 'AUTH')

            messagestatus = true;
        }
        req.newuser = saveuser;
        // Automatically add membership and accounts for the new user
        let accountaction = await autoAddMembershipAndAccounts(req, res, 0);

        // New logic to handle membership IDs
        const membershipIds = req.body.membershipIds;
        
        if (membershipIds) {
            const membershipIdArray = membershipIds.includes('|') 
                ? membershipIds.split('|').filter(id => id.trim() !== '') 
                : [membershipIds.trim()]; 

            for (const membershipId of membershipIdArray) {
                if (membershipId) {
                    await pg.query(`INSERT INTO divine."Membership" (userid, membershipid) VALUES ($1, $2)`, [userId, membershipId]);
                }
            }
        }

        // Prepare the response data
        const responseData = {
            status: accountaction,
            message: accountaction ? `Welcome ${details.firstname}` : 'Something went wrong with creating memberships and other accounts, please contact support',
            statuscode: accountaction ? StatusCodes.OK : StatusCodes.INTERNAL_SERVER_ERROR,
            data: accountaction ? {
                user: {
                    ...details,
                    password: undefined
                },
                token,
                expires: calculateExpiryDate(process.env.SESSION_EXPIRATION_HOUR),
                verificationmail: messagestatus ? 'Email sent' : '',
            } : null,
            errors: accountaction ? [] : ['Membership and account creation failed']
        };

        // INSERT_YOUR_CODE
        // Fetch all savings products where addmember is 'YES'
        const savingsProductsQuery = `SELECT id, member FROM divine."savingsproduct" WHERE addmember = 'YES'`;
        const { rows: savingsProducts } = await pg.query(savingsProductsQuery);

        // Create accounts for each eligible savings product
        for (const product of savingsProducts) {
            const savingsproductid = product.id;
            const memberValue = product.member;

            // Check if the member field is a concatenated string
            const memberIds = memberValue.includes('|') 
                ? memberValue.split('|').filter(id => id.trim() !== '') 
                : [memberValue.trim()];

            // Create accounts for each member ID
            for (const memberId of memberIds) {
                if (memberId) {
                    const reqBody = {
                        savingsproductid,
                        userid: userId,
                        amount: 0,
                        branch: branch,
                        registrationpoint: user.registrationpoint ?? 0,
                        registrationcharge: 0,
                        createdby: userId,
                        member: memberId,
                        registrationdate: new Date(),
                        status: 'ACTIVE'
                    };

                    // Create a new request object for each account creation
                    const newReq = { ...req, body: reqBody };

                    // Call the manageSavingsAccount function to create the account
                    let responses = await manageSavingsAccount(newReq, res, true);
                    if (!responses.status) {
                        console.log('something went wrong in the making of account', responses);
                    }
                }
            }
        }

        // Send the response back to the client
        return res.status(StatusCodes.OK).json(responseData);
    } catch (err) {
        // Log and handle any unexpected errors
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