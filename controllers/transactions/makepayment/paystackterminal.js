const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const https = require("https");

const makePaystackPayment = async (req, res) => {
    const { email, amount, accountnumber } = req.body;
    
    if (!email || !amount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Email and amount are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    } 

    // Paystack expects the amount in kobo, so multiply by 100
    const paystackAmount = amount * 100;

    try {
        const options = {
            hostname: "api.paystack.co",
            port: 443,
            path: "/transaction/initialize",
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY || ""}`,
                "Content-Type": "application/json"
            }
        };

        const responseData = await new Promise((resolve, reject) => {
            const paystackReq = https.request(options, (paystackRes) => {
                let data = "";
                paystackRes.on("data", (chunk) => {
                    data += chunk;
                });
                paystackRes.on("end", () => {
                    resolve(data);
                });
            });

            paystackReq.on("error", (error) => {
                reject(error);
            });

            // Send the request body to Paystack
            paystackReq.write(JSON.stringify({
                email,
                amount: paystackAmount,
                callback_url: "https://yourapp.com/paystack/callback" // Adjust callback URL as needed
            }));
            paystackReq.end();
        });

        const parsed = JSON.parse(responseData);

        if (!parsed.status) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: parsed.message || "Failed to generate Paystack payment link",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: []
            });
        }

        // Authorization URL and reference generated by Paystack
        const authorizationUrl = parsed.data.authorization_url;
        const reference = parsed.data.reference;

        // Save the reference to the database
        await pg.query(`
            INSERT INTO divine."paystackreferences" (accountnumber, email, reference, status, createdby)
            VALUES ($1, $2, $3, 'ACTIVE', $4)
        `, [accountnumber, email, reference, req.user.id]);

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Paystack payment link generated successfully",
            statuscode: StatusCodes.OK,
            data: {
                email,
                amount,
                paystackLink: authorizationUrl
            },
            errors: []
        });
    } catch (error) {
        console.error("Paystack Initialization Error:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An error occurred while generating Paystack link",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { makePaystackPayment };
