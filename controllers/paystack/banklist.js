const { StatusCodes } = require("http-status-codes");

const getBankList = async (req, res) => {
  const https = require('https');

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/bank?currency=NGN',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}` // Use environment variable for secret key
    }
  };

  https.request(options, response => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      try {
        const banks = JSON.parse(data);
        return res.status(StatusCodes.OK).json({
          status: true,
          message: "Bank list fetched successfully",
          statuscode: StatusCodes.OK,
          data: banks.data,
          errors: []
        });
      } catch (error) {
        console.error('Error parsing response:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: false,
          message: "Error parsing bank list response",
          statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
          data: null,
          errors: [error.message]
        });
      }
    });
  }).on('error', error => {
    console.error('Request Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "An error occurred while fetching bank list",
      statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
      data: null,
      errors: [error.message]
    });
  }).end();
};

module.exports = { getBankList };
