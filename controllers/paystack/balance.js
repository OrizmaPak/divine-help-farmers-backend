const { StatusCodes } = require("http-status-codes");
const https = require('https');

const getPaystackBalance = async (req, res) => {
    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/balance',
        method: 'GET',
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}`
        }
    };

    const request = https.request(options, paystackRes => {
        let data = '';

        paystackRes.on('data', (chunk) => {
            data += chunk; 
        });  

        paystackRes.on('end', () => {
            try { 
                const balanceData = JSON.parse(data);
                if (balanceData.status) { 
                    return res.status(StatusCodes.OK).json({
                        status: true,
                        message: "Paystack balance fetched successfully",
                        statuscode: StatusCodes.OK,
                        data: balanceData.data.map(balance => ({
                            ...balance,
                            balance: balance.balance / 100
                        })),
                        errors: []
                    });
                } else {
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                        status: false,
                        message: "Failed to fetch Paystack balance",
                        statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                        data: null,
                        errors: [balanceData.message]
                    });
                }
            } catch (error) {
                console.error('Error parsing Paystack response:', error);
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: false,
                    message: "Error parsing Paystack response",
                    statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                    data: null,
                    errors: [error.message]
                });
            }
        });
    });

    request.on('error', error => {
        console.error('Error communicating with Paystack:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Error communicating with Paystack",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    });

    request.end();
};

module.exports = { getPaystackBalance };
