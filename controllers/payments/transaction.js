const { StatusCodes } = require('http-status-codes');
const pg = require('../../db/pg');
const { saveTransaction } = require('../../utils/transactionHelper');
const { generateText } = require('../ai/ai');

const handleTransaction = async (req, res) => {
    if (req.transactionError) {
        const { status, message, errors } = req.transactionError;
        return res.status(status).json({
            status: false,
            message,
            data: {
                rawdetails: req.body.transactiondesc,
                details: await generateText(`${req.body.transactiondesc}... make a simple statement out of this.`),
                reference: req.body.reference
            },
            statuscode: status, 
            errors
        });
    } else if (!req.body.reference) {
        if (req.body.tfrom === 'BANK') {
            const excessAccountNumber = req.orgSettings.default_excess_account;
            req.body.transactiondesc += `Original Account Number: ${req.body.accountnumber}, Description: ${req.body.description}, Branch: ${req.body.branch}, Registration Point: ${req.body.registrationpoint}`;
            await saveTransaction(pg, req, res, excessAccountNumber, req.body.credit, req.body.debit, req.body.description, req.body.ttype, 'PENDING', 'EXCESS', req.user.id);
            await pg.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.OK).json({
                status: true,
                message: 'Transaction saved to excess account.',
                data: {
                    rawdetails: req.body.transactiondesc,
                    details: await generateText(`${req.body.transactiondesc}... make a simple statement out of this.`),
                    reference: req.body.reference
                },
                statuscode: StatusCodes.OK,
                errors: []
            });
        } else {
            await pg.end();
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: 'Internal error, please contact support.',
                data: null,
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                errors: []
            });
        }
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
                    rawdetails: req.body.transactiondesc,
                    details: await generateText(`${req.body.transactiondesc}... make a simple statement out of this.`),
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
