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
    const { login, password, verify = '', device = '' } = req.body;

    // Basic validation for login and password fields
    if (!login || !password) {
        let errors = [];
        if (!login) { 
            errors.push({
                field: 'Login',
                message: 'Login not found'
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
        let query, queryValue;
        // Determine if login is an email or phone number
        if (isValidEmail(login)) {
            query = `SELECT * FROM divine."User" WHERE email = $1`;
            queryValue = login;
        } else {
            query = `SELECT * FROM divine."User" WHERE phone = $1`;
            queryValue = login;
        }

        // Check if user exists in the database
        const { rows: [existingUser] } = await pg.query(query, [queryValue]);

        if (!existingUser) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "User not registered",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }
        if (existingUser.status != 'ACTIVE') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Your account has been ${existingUser.status}`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Verify the provided password against the stored hash
        const isPasswordValid = await bcrypt.compare(password, existingUser.password);

        if (isPasswordValid) {
            const { permissions, userpermissions, ...userWithoutPermissions } = existingUser;
            // Generate a JWT token for the session
            const token = jwt.sign({ user: userWithoutPermissions }, process.env.JWT_SECRET, {
                expiresIn: process.env.SESSION_EXPIRATION_HOUR + 'h',
            });

            // Store the session in the database
            await pg.query(`INSERT INTO divine."Session" 
            (sessiontoken, userid, expires, device) 
            VALUES ($1, $2, $3, $4) 
            `, [token, existingUser.id, calculateExpiryDate(process.env.SESSION_EXPIRATION_HOUR), device]);

            console.log('existingUser', existingUser);

            // Check if account details are missing
            console.log('Checking if account details are missing for user:', existingUser.id);
            if (!existingUser.account_number || !existingUser.account_name || !existingUser.bank_name) {
                console.log('Account details are missing, proceeding to check user on Paystack');
                const paystackCheckOptions = {
                    hostname: 'api.paystack.co',
                    port: 443,
                    path: `/customer/${existingUser.email}`,
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}`
                    }
                };

                console.log('Paystack check options:', paystackCheckOptions);

                const paystackCheckReq = https.request(paystackCheckOptions, paystackRes => {
                    let data = '';

                    paystackRes.on('data', (chunk) => {
                        console.log('Receiving data chunk from Paystack:', chunk);
                        data += chunk;
                    });

                    paystackRes.on('end', async () => {
                        console.log('Finished receiving data from Paystack');
                        const paystackResponse = JSON.parse(data);
                        console.log('Parsed Paystack response:', paystackResponse);  
                        let dedicatedAccountInfo = {};

                        if (paystackResponse.status === false) {
                            console.log('User not found on Paystack, creating user');
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

                            console.log('Paystack create options:', paystackCreateOptions);
                            console.log('Paystack create params:', params);

                            const paystackCreateReq = https.request(paystackCreateOptions, paystackCreateRes => {
                                let createData = '';

                                paystackCreateRes.on('data', (chunk) => { 
                                    console.log('Receiving data chunk from Paystack create:', chunk);
                                    createData += chunk;
                                }); 
  
                                paystackCreateRes.on('end', async () => {
                                    console.log('Finished receiving data from Paystack create');
                                    const createdUser = JSON.parse(createData); 
                                    console.log('Parsed created user data:', createdUser);

                                    console.log('Creating dedicated account for user');
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
                                        preferred_bank: "titan-paystack"
                                    });

                                    console.log('Dedicated account options:', dedicatedAccountOptions);
                                    console.log('Dedicated account params:', dedicatedAccountParams);

                                    const dedicatedAccountReq = https.request(dedicatedAccountOptions, dedicatedAccountRes => {
                                        let dedicatedAccountData = '';

                                        dedicatedAccountRes.on('data', (chunk) => {
                                            console.log('Receiving data chunk from dedicated account creation:', chunk);
                                            dedicatedAccountData += chunk;
                                        });

                                        dedicatedAccountRes.on('end', async () => {
                                            console.log('Finished receiving data from dedicated account creation');
                                            const accountData = JSON.parse(dedicatedAccountData);
                                            console.log('Parsed dedicated account data:', accountData);

                                            console.log('Updating user profile with account details');
                                            await pg.query(`UPDATE divine."User" SET account_number = $1, account_name = $2, bank_name = $3 WHERE id = $4`, 
                                            [accountData.data.account_number, accountData.data.account_name, accountData.data.bank.name, existingUser.id]);
                                        });
                                    }).on('error', error => {
                                        console.error('Error creating dedicated account:', error);
                                    });

                                    dedicatedAccountReq.write(dedicatedAccountParams);
                                    dedicatedAccountReq.end();
                                });
                            }).on('error', error => {
                                console.error('Error creating user on Paystack:', error);
                            });

                            paystackCreateReq.write(params);
                            paystackCreateReq.end();
                        } else {
                            console.log('User exists on Paystack');
                            if (!paystackResponse.data.dedicated_account) {
                                console.log('User exists but has no dedicated account, creating one');
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
                                    customer: paystackResponse.data.id,
                                    preferred_bank: "titan-paystack"
                                });

                                console.log('Dedicated account options:', dedicatedAccountOptions);
                                console.log('Dedicated account params:', dedicatedAccountParams);

                                const dedicatedAccountReq = https.request(dedicatedAccountOptions, dedicatedAccountRes => {
                                    let dedicatedAccountData = '';

                                    dedicatedAccountRes.on('data', (chunk) => {
                                        console.log('Receiving data chunk from dedicated account creation:', chunk);
                                        dedicatedAccountData += chunk;
                                    });

                                    dedicatedAccountRes.on('end', async () => {
                                        console.log('Finished receiving data from dedicated account creation');
                                        const accountData = JSON.parse(dedicatedAccountData);
                                        console.log('Parsed dedicated account data:', accountData);

                                        console.log('Updating user profile with account details');
                                        await pg.query(`UPDATE divine."User" SET account_number = $1, account_name = $2, bank_name = $3 WHERE id = $4`, 
                                        [accountData.data.account_number, accountData.data.account_name, accountData.data.bank.name, existingUser.id]);
                                    });
                                }).on('error', error => {
                                    console.error('Error creating dedicated account:', error);
                                });

                                dedicatedAccountReq.write(dedicatedAccountParams);
                                dedicatedAccountReq.end();
                            } else {
                                console.log('User has a dedicated account, extracting details');
                                const { account_name, account_number, bank } = paystackResponse.data.dedicated_account;
                                dedicatedAccountInfo = {
                                    account_name,
                                    account_number,
                                    bank_name: bank.name
                                };

                                console.log('Updating user profile with account details');
                                await pg.query(`UPDATE divine."User" SET account_number = $1, account_name = $2, bank_name = $3 WHERE id = $4`, 
                                [account_number, account_name, bank.name, existingUser.id]);
                            }
                        }

                        let messagestatus;
                        console.log('Checking if user has verified their email');
                        if (!existingUser.emailverified && verify) {
                            console.log('User has not verified email, creating verification token');
                            const vtoken = jwt.sign({ email: existingUser.email }, process.env.JWT_SECRET, { expiresIn: process.env.VERIFICATION_EXPIRATION_HOUR + 'h' });
                            console.log('Verification token created:', vtoken);

                            console.log('Inserting verification token into database');
                            await pg.query(`INSERT INTO divine."VerificationToken" 
                                            (identifier, token, expires) 
                                            VALUES ($1, $2, $3)`, [existingUser.id, vtoken, calculateExpiryDate(process.env.VERIFICATION_EXPIRATION_HOUR)]);

                            console.log('Sending confirmation email');
                            await sendEmail({
                                to: existingUser.email,
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

                            console.log('Tracking activity of sending verification email');
                            await activityMiddleware(req, existingUser.id, 'Verification Email Sent', 'AUTH');
                            messagestatus = true;
                        }

                        console.log('Checking if this is the first time the user is logging in');
                        if (existingUser.permissions == 'NEWUSER') {
                            console.log('First login detected, updating permissions');
                            await pg.query(`UPDATE divine."User" SET permissions = null WHERE id = $1`, [existingUser.id]);
                        }
                        console.log('Tracking login activity');
                        await activityMiddleware(req, existingUser.id, `Logged in Successfully ${existingUser.permissions == 'NEWUSER' ? 'and its the first login after registering' : ''} on a ${device} device`, 'AUTH');
                      
                        console.log('Preparing response data');
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
                        console.log('Sending response data:', responseData);
                        return res.status(StatusCodes.OK).json(responseData);
                    });
                }).on('error', error => {
                    console.error('Error checking user on Paystack:', error);
                });

                console.log('Ending Paystack check request');
                paystackCheckReq.end();
            } else {
                console.log('Account details are present, tracking successful login activity');
                await activityMiddleware(req, existingUser.id, 'Logged in Successfully', 'AUTH');

                console.log('Preparing response data for successful login');
                const { password, ...userWithoutPassword } = existingUser;
                const responseData = {
                    status: true,
                    message: `Welcome ${existingUser.firstname}`,
                    statuscode: StatusCodes.OK,
                    data: {
                        user: userWithoutPassword,
                        token,
                        expires: calculateExpiryDate(process.env.SESSION_EXPIRATION_HOUR)
                    },
                    errors: []
                };
                console.log('Sending response data for successful login:', responseData);
                return res.status(StatusCodes.OK).json(responseData); 
            } 
        } else {
            // Track the activity for failed login due to incorrect password
            await activityMiddleware(req, existingUser.id, 'Login Attempt Failed due to incorrect password', 'AUTH');
            
            return res.status(StatusCodes.UNAUTHORIZED).json({
                status: false,
                message: "Incorrect password",
                statuscode: StatusCodes.UNAUTHORIZED,
                data: null,
                errors: [{
                    field: 'Password',
                    message: 'The password you entered is incorrect.'
                }]
            });
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
        // Track the activity for failed login due to an unexpected error
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