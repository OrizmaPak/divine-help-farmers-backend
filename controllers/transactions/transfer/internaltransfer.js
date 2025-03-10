const { StatusCodes } = require("http-status-codes");
const { performTransaction } = require("../../../middleware/transactions/performTransaction");
// const { performTransaction } = require("../../middleware/transactions/performTransaction");

const internalTransfer = async (req, res) => {
    const { accountnumberfrom, amount, accountnumberto } = req.body;

    console.log('Received internal transfer request:', { accountnumberfrom, amount, accountnumberto });

    if (!accountnumberfrom || !amount || !accountnumberto) {
        console.log('Missing required fields for internal transfer');
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Account number from, amount, and account number to are required", 
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Missing required fields"]
        });
    }

    // Define the 'from' transaction
    const fromTransaction = {
        accountnumber: accountnumberfrom,
        credit: 0,
        debit: amount,
        reference: "",
        transactiondate: new Date(),
        transactiondesc: 'Internal transfer debit',
        currency: 'NGN',
        description: 'Internal transfer',
        branch: req.user.branch,
        registrationpoint: req.user.registrationpoint,
        ttype: 'DEBIT',
        tfrom: 'BANK',
        tax: false,
    };

    // Define the 'to' transaction
    const toTransaction = {
        accountnumber: accountnumberto,
        credit: amount,
        debit: 0,
        reference: "",
        transactiondate: new Date(),
        transactiondesc: 'Internal transfer credit',
        currency: 'NGN',
        description: 'Internal transfer',
        branch: req.user.branch,
        registrationpoint: req.user.registrationpoint,
        ttype: 'CREDIT',
        tfrom: 'BANK',
        tax: false,
    };

    try {
        const result = await performTransaction(fromTransaction, toTransaction);
        console.log('Internal Transfer Result:', result ? 'Success' : 'Failure', result);

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Internal transfer completed successfully",
            statuscode: StatusCodes.OK,
            data: result,
            errors: []
        });
    } catch (error) {
        console.error('Internal Transfer Failed:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An error occurred during internal transfer",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { internalTransfer };
