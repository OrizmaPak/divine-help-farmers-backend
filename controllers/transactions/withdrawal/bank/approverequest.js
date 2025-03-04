const { StatusCodes } = require("http-status-codes");
const pg = require("../../../../db/pg");
const { activityMiddleware } = require("../../../../middleware/activity");
const https = require('https');
const { makeTransferToAccount } = require("../../../../utils/transactionHelper");
const { performTransactionOneWay } = require("../../../../middleware/transactions/performTransaction");

const approveWithdrawalRequest = async (req, res) => {
    const { id } = req.body;
    const user = req.user;

    // Validate required fields
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

        // Fetch the withdrawal request to get the account number and amount
        const fetchQuery = {
            text: `SELECT * FROM divine."withdrawalrequest" WHERE id = $1`,
            values: [id]
        };

        const { rows: requestRows } = await client.query(fetchQuery);

        if (requestRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Withdrawal request not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const withdrawalRequest = requestRows[0];

        // Check account balance
        const balanceQuery = {
            text: `SELECT SUM(credit) - SUM(debit) AS balance FROM divine."transaction" WHERE accountnumber = $1`,
            values: [withdrawalRequest.accountnumber]
        };

        const { rows: balanceRows } = await client.query(balanceQuery);
        const accountBalance = balanceRows[0].balance || 0;

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
        const userQuery = {
            text: `SELECT * FROM divine."User" WHERE id = $1`,
            values: [withdrawalRequest.userid]
        };

        const { rows: userRows } = await client.query(userQuery);

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

        // Check if recipient exists in paystackrecipient table
        const recipientQuery = {
            text: `SELECT * FROM divine."paystackrecipient" WHERE accountnumber = $1 AND bank = $2`,
            values: [bankDetails.accountNumber, bankDetails.bank]
        };

        const { rows: recipientRows } = await client.query(recipientQuery);

        let recipientCode;
        if (recipientRows.length > 0) {
            recipientCode = recipientRows[0].recipient;
        } else {
            // If not found, create a new recipient on Paystack
            const recipientParams = JSON.stringify({
                "type": "nuban",
                "name": bankDetails.name || "Unknown User",
                "account_number": bankDetails.accountNumber,
                "bank_code": bankDetails.bank,
                "currency": "NGN"
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

            await new Promise((resolve, reject) => {
                const recipientReq = https.request(recipientOptions, ress => {
                    let data = '';

                    ress.on('data', (chunk) => {
                        console.log('Received chunk of data:', chunk);
                        data += chunk;
                    });

                    ress.on('end', async () => {
                        try {
                            const paystackResponse = JSON.parse(data);
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

                            // Save the new recipient to the paystackrecipient table
                            const insertRecipientQuery = {
                                text: `INSERT INTO divine."paystackrecipient" (accountnumber, bank, recipient, dateadded, status, createdby) VALUES ($1, $2, $3, $4, $5, $6)`,
                                values: [bankDetails.accountNumber, bankDetails.bank, recipientCode, new Date().toISOString(), 'ACTIVE', req.user.id]
                            };

                            await client.query(insertRecipientQuery);

                            // Make a transfer to the account
                            await makeTransferToAccount(recipientCode, withdrawalRequest.amount);
                            resolve();
                        } catch (error) {
                            await client.query('ROLLBACK');
                            console.error('Error processing Paystack response:', error);
                            reject(error);
                        }
                    });
                }).on('error', async error => {
                    console.error(error);
                    await client.query('ROLLBACK');
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                        status: false,
                        message: "Error communicating with Paystack",
                        statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                        data: null,
                        errors: [error.message]
                    });
                });

                recipientReq.write(recipientParams);
                recipientReq.end();
            });
        }

        // If recipient already exists, make a transfer to the account
        if (recipientCode) {
            await makeTransferToAccount(recipientCode, withdrawalRequest.amount);
        }

        // Perform a one-way transaction using performTransactionOneWay
        const transactionData = {
            accountnumber: withdrawalRequest.accountnumber,
            credit: 0,
            debit: withdrawalRequest.amount,
            reference: "",
            transactiondate: new Date(),
            transactiondesc: 'Withdrawal approved',
            currency: 'NGN',
            description: 'Withdrawal approved',
            branch: req.user.id,
            registrationpoint: req.user.registrationpoint,
            ttype: 'DEBIT',
            tfrom: 'BANK',
            tax: false,
            userid: withdrawalRequest.userid,
            status: 'ACTIVE',
            dateadded: new Date()
        };

        const transactionResult = await performTransactionOneWay(transactionData, withdrawalRequest.userid);

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

        // Update the request status to APPROVED
        const updateQuery = {
            text: `UPDATE divine."withdrawalrequest"
                   SET requeststatus = 'APPROVED'
                   WHERE id = $1 RETURNING *`,
            values: [id]
        };

        const { rows: updatedRows } = await client.query(updateQuery);

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
        await activityMiddleware(req, user.id, 'Withdrawal request approved and withdrawal successful', 'WITHDRAWAL');

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
        await activityMiddleware(req, user.id, 'An unexpected error occurred approving withdrawal request', 'WITHDRAWAL');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    } finally {
        // client.release();
    }
};

module.exports = { approveWithdrawalRequest };