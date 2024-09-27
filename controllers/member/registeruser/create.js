const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcryptjs");
const {isValidEmail}  = require("../../../utils/isValidEmail");
const pg = require("../../../db/pg");
const { sendEmail } = require("../../../utils/sendEmail");


const registeruser = async (req, res) => {
    const { firstname, lastname, email, phone, othernames = '', verify = false, device = 'registered by staff', country = '', state = '', image = '', emailverified = null, address = '', role = 'USER', permissions = null, officeaddress = '', image2 = '', gender = '', occupation = '', lga = '', town = '', maritalstatus = '', spousename = '', stateofresidence = '', lgaofresidence = '', nextofkinfullname = '', nextofkinphone = '', nextofkinrelationship = '', nextofkinaddress = '', nextofkinofficeaddress = '', nextofkinoccupation = '', dateofbirth = null, branch = 1, registrationpoint = 0, dateadded = new Date(), lastupdated = null, status = 'ACTIVE', createdby = 0, id = null } = req.body;
    console.log({ firstname, lastname, email, othernames, ema: isValidEmail(email) });
    
    const user = req.user

    // Basic validation
    if (!firstname || !lastname || !email || !isValidEmail(email)) {
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

        // Check if the branch exists
        const { rows: branchExists } = await pg.query(`SELECT * FROM divine."Branch" WHERE id = $1`, [branch]);
        if (branchExists.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Branch does not exist",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(phone, 10);

        // If id is provided, update the user
        if (id) {
            const { rows: updatedUser } = await pg.query(`UPDATE divine."User" SET 
            firstname = $1, lastname = $2, othernames = $3, email = $4, password = $5, role = $6, permissions = $7, country = $8, state = $9, phone = $10, emailverified = $11, address = $12, officeaddress = $13, image = $14, image2 = $15, gender = $16, occupation = $17, lga = $18, town = $19, maritalstatus = $20, spousename = $21, stateofresidence = $22, lgaofresidence = $23, nextofkinfullname = $24, nextofkinphone = $25, nextofkinrelationship = $26, nextofkinaddress = $27, nextofkinofficeaddress = $28, nextofkinoccupation = $29, dateofbirth = $30, branch = $31, registrationpoint = $32, dateadded = $33, lastupdated = $34, status = $35, createdby = $36 WHERE id = $37 RETURNING *`, 
            [firstname, lastname, othernames, email, hashedPassword, role, permissions, country, state, phone, emailverified, address, officeaddress, image, image2, gender, occupation, lga, town, maritalstatus, spousename, stateofresidence, lgaofresidence, nextofkinfullname, nextofkinphone, nextofkinrelationship, nextofkinaddress, nextofkinofficeaddress, nextofkinoccupation, dateofbirth, branch, registrationpoint, dateadded, lastupdated, "PENDING", createdby, id]);
            if (updatedUser.length > 0) {
                return res.status(StatusCodes.OK).json({
                    status: true,
                    message: `User ${firstname} ${lastname} updated successfully`,
                    statuscode: StatusCodes.OK,
                    data: updatedUser,
                    errors: []
                });
            } else {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: `User with id ${id} not found`,
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }
        } else {
            // Insert new user using raw query to avoid SQL injection attacks and other vulnerabilities 
            const { rows: [saveuser] } = await pg.query(`INSERT INTO divine."User" 
            (firstname, lastname, othernames, email, password, role, permissions, country, state, phone, emailverified, address, officeaddress, image, image2, gender, occupation, lga, town, maritalstatus, spousename, stateofresidence, lgaofresidence, nextofkinfullname, nextofkinphone, nextofkinrelationship, nextofkinaddress, nextofkinofficeaddress, nextofkinoccupation, dateofbirth, branch, registrationpoint, dateadded, lastupdated, status, createdby) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36) RETURNING id`, [firstname, lastname, othernames, email, hashedPassword, role, permissions, country, state, phone, null, address, officeaddress, image, image2, gender, occupation, lga, town, maritalstatus, spousename, stateofresidence, lgaofresidence, nextofkinfullname, nextofkinphone, nextofkinrelationship, nextofkinaddress, nextofkinofficeaddress, nextofkinoccupation, dateofbirth, branch, registrationpoint, dateadded, lastupdated, status, createdby]);
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
                          <li>Login: <p style="color: red;font-weight: bold">Login with your email and user your registered phone number as password</p></li>
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
            
            const responseData = {
                status: true,
                message: `Congratulations!! you have successfully registered ${firstname} ${lastname} under you`,
                statuscode: StatusCodes.OK,
                data: null,
                errors: []
            };

            if(saveuser > 0){
                return res.status(StatusCodes.OK).json(responseData);
            }else{
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: `Something went wrong!! User not registered cross check the information and save again`,
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                })
            }
        }
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
    registeruser
};