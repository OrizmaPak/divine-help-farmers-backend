const { StatusCodes } = require("http-status-codes");
const https = require('https');

const resolveAccountNumber = async (req, res) => {
    const { account_number, bank_code } = req.query;

    console.log('Received request to resolve account number:', account_number, 'with bank code:', bank_code);

    if (!account_number || !bank_code) {
        console.log('Missing account number or bank code');
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Account number and bank code are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Missing account number or bank code"]
        });
    }

    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}` // Use environment variable for secret key
        }
    };

    console.log('Sending request to Paystack with options:', options);

    const request = https.request(options, response => {
        let data = '';

        response.on('data', (chunk) => {
            console.log('Received chunk of data:', chunk);
            data += chunk;
        });

        response.on('end', () => {
            console.log('Received response from Paystack:', data);
            try {
                const accountInfo = JSON.parse(data); 
                console.log('Parsed account information:', accountInfo); 
                return res.status(StatusCodes.OK).json({
                    status: true,
                    message: "Account resolved successfully",
                    statuscode: StatusCodes.OK, 
                    data: accountInfo,
                    errors: [] 
                });
            } catch (error) {
                console.error('Error parsing response:', error);
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: false,
                    message: "Error parsing account resolution response",
                    statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                    data: null,
                    errors: [error.message]
                });
            }
        });
    });

    request.on('error', error => {
        console.error('Request Error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An error occurred while resolving account",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    });

    request.end();
};

module.exports = { resolveAccountNumber };
