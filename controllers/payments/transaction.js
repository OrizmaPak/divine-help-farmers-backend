const { StatusCodes } = require('http-status-codes');
const pg = require('../../db/pg');

const handleTransaction = async (req, res) => {
    if (req.transactionError) {
        const { status, message, errors } = req.transactionError;
        return res.status(status).json({
            status: false,
            message,
            data: {
                details: req.body.transactiondesc,
                reference: req.body.reference
            },
            statuscode: status, 
            errors
        });
    } else if (!req.body.reference && !req.body.transactiondesc) {
        await client.end();
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: 'Internal error, please contact support.',
            data: null,
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            errors: []
        });
    } else {
        try {
            const queryResult = await pg.query('SELECT * FROM divine."transaction" WHERE reference = $1', [req.body.reference]);
            if (queryResult.rowCount === 0) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    status: false,
                    message: 'Transaction Failed.',
                    data: null,
                    statuscode: StatusCodes.NOT_FOUND,
                    errors: []
                });
            }
            return res.status(StatusCodes.OK).json({
                status: true,
                message: 'Transaction successful.',
                data: {
                    details: req.body.transactiondesc,
                    reference: req.body.reference
                },
                statuscode: StatusCodes.OK,
                errors: []
            });
        } catch (error) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: 'Internal error, please contact support.',
                data: null,
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                errors: [error.message]
            });
        }
    }
};

module.exports = {
    handleTransaction
};
