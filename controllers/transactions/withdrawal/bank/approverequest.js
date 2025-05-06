const { StatusCodes } = require("http-status-codes");
const pg = require("../../../../db/pg");
const { activityMiddleware } = require("../../../../middleware/activity");
const https = require('https');
const { makeTransferToAccount } = require("../../../../utils/transactionHelper");
const { performTransactionOneWay } = require("../../../../middleware/transactions/performTransaction");

const approveWithdrawalRequest = async (req, res) => {
    const { id } = req.body;
    const user = req.user;

    if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Withdrawal request ID is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    const client = pg;
    try {
        await client.query('BEGIN');

        // Fetch withdrawal request
        const { rows: requestRows } = await client.query({
            text: `SELECT * FROM divine."withdrawalrequest" WHERE id = $1 AND requeststatus = 'PENDING'`,
            values: [id]
        });
        if (requestRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Withdrawal request not found or already approved",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }
        const withdrawalRequest = requestRows[0];

        // Check account balance
        const { rows: balanceRows } = await client.query({
            text: `SELECT COALESCE(SUM(credit),0) - COALESCE(SUM(debit),0) AS balance 
                   FROM divine."transaction" WHERE accountnumber = $1`,
            values: [withdrawalRequest.accountnumber]
        });
        const accountBalance = Number(balanceRows[0].balance);
        if (accountBalance < withdrawalRequest.amount) {
            await client.query('ROLLBACK');
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Insufficient funds",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Fetch user details
        const { rows: userRows } = await client.query({
            text: `SELECT * FROM divine."User" WHERE id = $1`,
            values: [withdrawalRequest.userid]
        });
        if (userRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "User not found for the withdrawal request",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }
        const accountuser = userRows[0];

        // Determine bank details
        let bankDetails;
        if (accountuser.bank_account_number) {
            bankDetails = {
                accountNumber: accountuser.bank_account_number,
                bank: accountuser.bank,
                name: accountuser.bank_account_name
            };
        } else if (accountuser.bank_account_number2) {
            bankDetails = {
                accountNumber: accountuser.bank_account_number2,
                bank: accountuser.bank2,
                name: accountuser.bank_account_name2
            };
        } else {
            await client.query('ROLLBACK');
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "No valid bank account details found for the user",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Look up existing Paystack recipient
        const { rows: recipientRows } = await client.query({
            text: `SELECT recipient FROM divine."paystackrecipient"
                   WHERE accountnumber = $1 AND bank = $2`,
            values: [bankDetails.accountNumber, bankDetails.bank]
        });

        let recipientCode;
        if (recipientRows.length > 0) {
            recipientCode = recipientRows[0].recipient;
        } else {
            // Create new Paystack recipient
            const recipientParams = JSON.stringify({
                type: "nuban",
                name: bankDetails.name || "Unknown User",
                account_number: bankDetails.accountNumber,
                bank_code: bankDetails.bank,
                currency: "NGN"
            });
            const recipientOptions = {
                hostname: 'api.paystack.co',
                port: 443,
                path: '/transferrecipient',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_PRODUCTION_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            };

            let paystackResponse;
            try {
                paystackResponse = await new Promise((resolve, reject) => {
                    const paystackReq = https.request(recipientOptions, payRes => {
                        let data = '';
                        payRes.on('data', chunk => data += chunk);
                        payRes.on('end', () => {
                            try {
                                resolve(JSON.parse(data));
                            } catch (err) {
                                reject(err);
                            }
                        });
                    });
                    paystackReq.on('error', err => reject(err));
                    paystackReq.write(recipientParams);
                    paystackReq.end();
                });
            } catch (err) {
                await client.query('ROLLBACK');
                console.error('Error communicating with Paystack:', err);
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: false,
                    message: "Error communicating with Paystack",
                    statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                    data: null,
                    errors: [err.message]
                });
            }

            if (!paystackResponse.status) {
                await client.query('ROLLBACK');
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: false,
                    message: "Failed to create Paystack transfer recipient",
                    statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                    data: null,
                    errors: [paystackResponse.message]
                });
            }

            recipientCode = paystackResponse.data.recipient_code;
            await client.query({
                text: `INSERT INTO divine."paystackrecipient"
                       (accountnumber, bank, recipient, dateadded, status, createdby)
                       VALUES ($1, $2, $3, $4, $5, $6)`,
                values: [
                    bankDetails.accountNumber,
                    bankDetails.bank,
                    recipientCode,
                    new Date().toISOString(),
                    'ACTIVE',
                    user.id
                ]
            });
        }

        // Make a single transfer
        let transferResponse;
        try {
            transferResponse = await makeTransferToAccount(
                recipientCode,
                withdrawalRequest.amount,
                'recipient'
            );

            if (!transferResponse || !transferResponse.status) {
                await client.query('ROLLBACK');
                console.error('Transfer failed at Paystack');
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    status: false,
                    message: "Transfer failed at Paystack",
                    statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                    data: null,
                    errors: ["Transfer failed at Paystack"]
                });
            }
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Transfer failed:', err);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Failed to make transfer",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: [err.message]
            });
        }
        const transref = transferResponse.reference || '';

        // Create transaction record
        const transactionData = {
            accountnumber: withdrawalRequest.accountnumber,
            credit: 0,
            debit: withdrawalRequest.amount,
            reference: "",
            transactiondate: new Date(),
            transactiondesc: `Withdrawal approved || ${transref}`,
            currency: 'NGN',
            description: 'Withdrawal approved',
            branch: user.id,
            registrationpoint: user.registrationpoint,
            ttype: 'DEBIT',
            tfrom: 'BANK',
            tax: false,
            userid: withdrawalRequest.userid,
            status: 'ACTIVE',
            dateadded: new Date()
        };
        const transactionResult = await performTransactionOneWay(
            transactionData,
            withdrawalRequest.userid
        );
        if (!transactionResult.status) {
            await client.query('ROLLBACK');
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "Failed to create transaction",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: []
            });
        }

        // Update withdrawal request status
        const { rows: updatedRows } = await client.query({
            text: `UPDATE divine."withdrawalrequest"
                   SET requeststatus = 'APPROVED'
                   WHERE id = $1
                   RETURNING *`,
            values: [id]
        });
        if (updatedRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Withdrawal request not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        await client.query('COMMIT');
        await activityMiddleware(
            req,
            user.id,
            'Withdrawal request approved and withdrawal successful',
            'WITHDRAWAL'
        );
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Withdrawal request approved and withdrawal successful",
            statuscode: StatusCodes.OK,
            data: updatedRows[0],
            errors: []
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Unexpected Error:', error);
        await activityMiddleware(
            req,
            user.id,
            'An unexpected error occurred approving withdrawal request',
            'WITHDRAWAL'
        );
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { approveWithdrawalRequest };