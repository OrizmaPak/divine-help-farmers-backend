const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcrypt");
const { isValidEmail } = require("../../utils/isValidEmail");
const pg = require("../../db/pg");
const jwt = require("jsonwebtoken");
const { calculateExpiryDate } = require("../../utils/expiredate");
const { sendEmail } = require("../../utils/sendEmail");
const { activityMiddleware } = require("../../middleware/activity");
const https = require('https');

async function login(req, res) {
    const { email, password, verify = '', device = '' } = req.body;
    console.log({ email, password });

    // Basic validation
    if (!email || !password || !isValidEmail(email)) {
        let errors = [];
        if (!email) {
            errors.push({
                field: 'Email',
                message: 'Email not found'
            });
        }
        if (!password) {
            errors.push({
                field: 'Password',
                message: 'Password not found'
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
                message: "Email not registered",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }
        if (existingUser.status != 'ACTIVE') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Your this account has been ${existingUser.status}`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, existingUser.password);

        if (isPasswordValid) {
            const { permissions, userpermissions, ...userWithoutPermissions } = existingUser;
            const token = jwt.sign({ user: userWithoutPermissions }, process.env.JWT_SECRET, {
                expiresIn: process.env.SESSION_EXPIRATION_HOUR + 'h',
            });
            console.log(token);

            // STORE THE SESSION
            await pg.query(`INSERT INTO divine."Session" 
            (sessiontoken, userid, expires, device) 
            VALUES ($1, $2, $3, $4) 
            `, [token, existingUser.id, calculateExpiryDate(process.env.SESSION_EXPIRATION_HOUR), device]);

            // Check if the user is already on Paystack
            const paystackCheckOptions = {
                hostname: 'api.paystack.co',
                port: 443,
                path: `/customer/${email}`,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}`
                }
            };

            const paystackCheckReq = https.request(paystackCheckOptions, paystackRes => {
                let data = '';

                paystackRes.on('data', (chunk) => {
                    data += chunk;
                });

                paystackRes.on('end', async () => {
                    const paystackResponse = JSON.parse(data);
                    let dedicatedAccountInfo = {};

                    if (paystackResponse.status === false) {
                        // User not found on Paystack, create the user
                        const paystackCreateOptions = {
                            hostname: 'api.paystack.co',
                            port: 443,
                            path: '/customer',
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}`,
                                'Content-Type': 'application/json'
                            }
                        };

                        const params = JSON.stringify({
                            email: existingUser.email,
                            first_name: existingUser.firstname,
                            last_name: existingUser.lastname,
                            phone: existingUser.phone
                        });

                        const paystackCreateReq = https.request(paystackCreateOptions, paystackCreateRes => {
                            let createData = '';

                            paystackCreateRes.on('data', (chunk) => {
                                createData += chunk;
                            });

                            paystackCreateRes.on('end', async () => {
                                const createdUser = JSON.parse(createData);
                                console.log('User created on Paystack:', createdUser);

                                // Check if the user has a dedicated account
                                if (!createdUser.data.dedicated_account) {
                                    // Create a dedicated account for the user
                                    const dedicatedAccountOptions = {
                                        hostname: 'api.paystack.co',
                                        port: 443,
                                        path: '/dedicated_account',
                                        method: 'POST',
                                        headers: {
                                            Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}`,
                                            'Content-Type': 'application/json'
                                        }
                                    };

                                    const dedicatedAccountParams = JSON.stringify({
                                        customer: createdUser.data.id,
                                        preferred_bank: "wema-bank"
                                    });

                                    const dedicatedAccountReq = https.request(dedicatedAccountOptions, dedicatedAccountRes => {
                                        let dedicatedAccountData = '';

                                        dedicatedAccountRes.on('data', (chunk) => {
                                            dedicatedAccountData += chunk;
                                        });

                                        dedicatedAccountRes.on('end', () => {
                                            console.log('Dedicated account created:', JSON.parse(dedicatedAccountData));
                                        });
                                    }).on('error', error => {
                                        console.error('Error creating dedicated account:', error);
                                    });

                                    dedicatedAccountReq.write(dedicatedAccountParams);
                                    dedicatedAccountReq.end();
                                }
                            });
                        }).on('error', error => {
                            console.error('Error creating user on Paystack:', error);
                        });

                        paystackCreateReq.write(params);
                        paystackCreateReq.end();
                    } else if (paystackResponse.data.dedicated_account) {
                        // If the user has a dedicated account, extract the details
                        const { account_name, account_number, bank } = paystackResponse.data.dedicated_account;
                        dedicatedAccountInfo = {
                            account_name,
                            account_number,
                            bank_name: bank.name
                        };
                    }

                    let messagestatus;
                    // CHECK IF THE USER HAS VALIDATED HIS EMAIL
                    if (!existingUser.emailverified && verify) {
                        // create verification token
                        const vtoken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: process.env.VERIFICATION_EXPIRATION_HOUR + 'h' });
                        // create a verification link and code
                        await pg.query(`INSERT INTO divine."VerificationToken" 
                                        (identifier, token, expires) 
                                        VALUES ($1, $2, $3)`, [existingUser.id, vtoken, calculateExpiryDate(process.env.VERIFICATION_EXPIRATION_HOUR)]);

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
                                        <p>Hello ${existingUser.firstname},</p>
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
                        });

                        //  TRACK THE ACTIVITY
                        await activityMiddleware(req, existingUser.id, 'Verification Email Sent', 'AUTH');
                        messagestatus = true;
                    }

                    // CHECK IF THIS IS THE FIRST TIME THE USER IS LOGINING
                    if (existingUser.permissions == 'NEWUSER') {
                        await pg.query(`UPDATE divine."User" SET permissions = null WHERE id = $1`, [existingUser.id]);
                    }
                    //  TRACK THE ACTIVITY
                    await activityMiddleware(req, existingUser.id, `Logged in Successfully ${existingUser.permissions == 'NEWUSER' ? 'and its the first login after registering' : ''} on a ${device} device`, 'AUTH');
                  

                    const { password, ...userWithoutPassword } = existingUser;
                    const userWithAccountInfo = { ...userWithoutPassword, ...dedicatedAccountInfo };
                    const responseData = {
                        status: true,
                        message: `Welcome ${existingUser.firstname}`,
                        statuscode: StatusCodes.OK,
                        data: {
                            user: userWithAccountInfo,
                            token,
                            expires: calculateExpiryDate(process.env.SESSION_EXPIRATION_HOUR),
                            verificationmail: messagestatus ? 'Email sent' : ''
                        },
                        errors: []
                    };
                    console.log(responseData)
                    return res.status(StatusCodes.OK).json(responseData);
                });
            }).on('error', error => {
                console.error('Error checking user on Paystack:', error);
            });

            paystackCheckReq.end();
        } else {
            //  TRACK THE ACTIVITY
            await activityMiddleware(req, existingUser.id, 'Inputted wrong password', 'AUTH');
            
            return res.status(StatusCodes.UNAUTHORIZED).json({
                status: false,
                message: "Invalid credentials",
                statuscode: StatusCodes.UNAUTHORIZED,
                data: null,
                errors: []
            });
        } 
    } catch (err) {
        console.error('Unexpected Error:', err);
        //  TRACK THE ACTIVITY
        await activityMiddleware(req, existingUser.id, 'Login Attempt Failed due to an unexpected error', 'AUTH');
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
    login 
};