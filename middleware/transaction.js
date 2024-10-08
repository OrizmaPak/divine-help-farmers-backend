const pg = require('../db/pg'); // Use your existing pg setup
const { StatusCodes } = require('http-status-codes'); // Assuming you are using http-status-codes for status codes
const activityMiddleware = require('../middleware/activity'); // Import activity middleware

// Middleware function to save a transaction
const saveTransactionMiddleware = async (req, res, next) => {
    let user = req.user;
    const client = pg
    try {
        await client.query('BEGIN'); // Start a transaction

        // Extract transaction details from the request body
        const {
            accountnumber,
            credit,
            debit,
            reference,
            transactiondate = new Date(),
            transactiondesc = '',
            currency,
            description = '',
            ttype,
            tax = false,
        } = req.body;

        let whichaccount;
        let accountuser;
        let personnalaccount

        // Log activity
        await activityMiddleware(req, req.user.id, 'Attempting to save transaction', 'TRANSACTION');
        
        // 4. Generate a transaction reference if not provided
        const transactionReference = reference || `${accountnumber}${new Date().toISOString()}`;

        // 7. Check for back-dated or future transactions
        const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings" LIMIT 1`;
        const orgSettingsResult = await client.query(orgSettingsQuery);
        if (orgSettingsResult.rowCount === 0) {
            await activityMiddleware(req, req.user.id, 'Organisation settings not found', 'TRANSACTION');
            await client.query('ROLLBACK'); // Rollback the transaction
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: 'Organisation settings not found.',
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: ['Internal server error.'],
            });
        }
        const orgSettings = orgSettingsResult.rows[0];

        // 1. Validate the account number and status
        const accountQuery = `SELECT * FROM divine."savings" WHERE accountnumber = $1`;
        const accountResult = await client.query(accountQuery, [accountnumber]);
        if (accountResult.rowCount !== 0) {
            whichaccount = 'SAVINGS';
        } else if (accountnumber.startsWith(orgSettings.personal_account_prefix)) {
            if (!user.phone || accountnumber != `${orgSettings.personal_account_prefix}${user.phone}`) {
                await client.query('ROLLBACK'); // Rollback the transaction
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: 'Invalid account number.',         
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ['Account not found.'],
                });
            }
            whichaccount = 'PERSONAL';
        }
        // establish the personal accountnumber
        req.body['personnalaccountnumber'] = `${orgSettings.personal_account_prefix}${user.phone}`
        personnalaccount = `${orgSettings.personal_account_prefix}${user.phone}`

        if (accountResult.rowCount === 0 && !accountnumber.startsWith(orgSettings.personal_account_prefix)) {
            await saveFailedTransaction(client, req, 'Invalid account number', transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Invalid account number.',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ['Account not found.'],
            });
        }

        // Get the user of the account number if it's a savings account
        if (whichaccount === 'SAVINGS') {            
            accountuser = accountResult.rows[0];
        }

        const account = accountResult.rows[0];
        if (account.status !== 'ACTIVE') {
            await saveFailedTransaction(client, req, 'Account is not active.', transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Account is not active.',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ['Inactive account.'],
            });
        }

        // 2. Validate the savings product
        const savingsProductQuery = `SELECT * FROM divine."savingsproduct" WHERE id = $1`;
        const savingsProductResult = await client.query(savingsProductQuery, [account.savingsproductid]);
        if (savingsProductResult.rowCount === 0) {
            await saveFailedTransaction(client, req, 'Invalid savings product', transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Invalid savings product.',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ['Savings product not found.'],
            });
        }
        const savingsProduct = savingsProductResult.rows[0];
        if (savingsProduct.status !== 'ACTIVE') {
            await saveFailedTransaction(client, req, 'Inactive savings product', transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Savings product is not active.',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ['Inactive savings product.'],
            });
        }

        // 3. Check if both credit and debit are greater than zero
        if (credit > 0 && debit > 0) {
            await saveFailedTransaction(client, req, 'Invalid transaction', transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: 'Both credit and debit cannot be greater than zero.',
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ['Invalid transaction.'],
            });
        }


        // 5. Initialize transaction status and reason for rejection
        let transactionStatus = 'PENDING';
        let reasonForRejection = '';
        let reasonForPending = '';

        // 6. Check for currency mismatch
        if (!currency || currency !== savingsProduct.currency) {
            transactionStatus = 'FAILED';
            reasonForRejection = 'Currency mismatch or not provided';
            // Immediately save the transaction as failed and stop processing
            await saveFailedTransaction(client, req, reasonForRejection, transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.CREATED).json({
                status: false,
                message: 'Transaction failed due to currency mismatch.',
                statuscode: StatusCodes.CREATED,
                data: null,
                errors: ['Currency mismatch or not provided.'],
            });
        }

        const currentDate = new Date();
        if (!orgSettings.allow_back_dated_transaction && new Date(transactiondate) < currentDate) {
            transactionStatus = 'FAILED';
            reasonForRejection = 'Back-dated transactions are not allowed';
            // Immediately save the transaction as failed and stop processing
            await saveFailedTransaction(client, req, reasonForRejection, transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.FAILED_DEPENDENCY).json({
                status: false,
                message: 'Transaction failed due to back-dated transaction.', 
                statuscode: StatusCodes.FAILED_DEPENDENCY,
                data: null,
                errors: ['Back-dated transactions are not allowed.'],
            });
        }
        if (!orgSettings.allow_future_transaction && new Date(transactiondate) > currentDate) {
            transactionStatus = 'FAILED';
            reasonForRejection = 'Future transactions are not allowed';
            // Immediately save the transaction as failed and stop processing
            await saveFailedTransaction(client, req, reasonForRejection, transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.FAILED_DEPENDENCY).json({
                status: false,
                message: 'Transaction failed due to future transaction.',
                statuscode: StatusCodes.FAILED_DEPENDENCY,
                data: null,
                errors: ['Future transactions are not allowed.'],
            });
        }
        const rejectTransactionDateQuery = `SELECT * FROM divine."Rejecttransactiondate" WHERE rejectiondate = $1`;
        const rejectTransactionDateResult = await client.query(rejectTransactionDateQuery, [currentDate.toISOString().split('T')[0]]);
        if (rejectTransactionDateResult.rowCount > 0) {
            transactionStatus = 'FAILED';
            reasonForRejection = 'Transaction date is a rejected date';
            // Immediately save the transaction as failed and stop processing
            await saveFailedTransaction(client, req, reasonForRejection, transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            return res.status(StatusCodes.FAILED_DEPENDENCY).json({
                status: false,
                message: 'Transaction failed due to rejected date.',
                statuscode: StatusCodes.FAILED_DEPENDENCY,
                data: null,
                errors: ['Transaction date is a rejected date.'],
            });
        }

        if(whichaccount === 'SAVINGS'){
            
            // Group transactions based on credit and debit
            if (credit > 0) {

                // 8. Handle Deposit Charge
                if (credit > 0 && savingsProduct.depositcharge) {
                    const chargeAmount = calculateCharge(savingsProduct, credit);
                    await client.query(
                        `INSERT INTO divine."transaction" (accountnumber, debit, description, reference, status, transactiondesc, schema) VALUES ($1, $2, $3, $4, 'PENDING CHARGE', 'DEPOSIT CHARGE', 'savingsproduct')`,
                        [accountnumber, chargeAmount, 'Deposit Charge', generateNewReference(transactionReference)]
                    );
                    await client.query('COMMIT'); // Commit the transaction
                }
    
                // 7. Savings Product Rules - Allow Deposit
                if (credit > 0 && !savingsProduct.allowdeposit) {
                    transactionStatus = 'REDIRECTED';
                    reasonForRejection = 'Deposits not allowed on this product';
                    // Handle redirection to excess account logic
                    await handleRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount);
                    await client.query('COMMIT'); // Commit the transaction
                    return res.status(StatusCodes.MISDIRECTED_REQUEST).json({
                        status: false,
                        message: 'Transaction has been redirected to the personal account because the savings account is restricted from taking deposits.',
                        statuscode: StatusCodes.MISDIRECTED_REQUEST,
                        data: null,
                        errors: ['Deposits not allowed on this product. Transaction redirected to personal account.'],
                    });
                }

                // 10. Compulsory Deposit Logic
                if (savingsProduct.compulsorydeposit) {
                    if (savingsProduct.compulsorydeposittype === 'FIXED') {
                        if (!savingsProduct.compulsorydepositspillover && !savingsProduct.compulsorydepositdeficit) {
                            if (credit !== savingsProduct.compulsorydepositfrequencyamount) {
                                transactionStatus = 'FAILED';
                                reasonForRejection = 'Credit amount does not match compulsory deposit amount';
                                await handleRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount);
                                await client.query('COMMIT'); // Commit the transaction
                                return res.status(StatusCodes.MISDIRECTED_REQUEST).json({
                                    status: false,
                                    message: 'Credit amount does not match compulsory deposit amount. Personal Account credited instead',
                                    statuscode: StatusCodes.MISDIRECTED_REQUEST,
                                    data: null,
                                    errors: ['Credit amount does not match compulsory deposit amount. Personal Account credited instead'],
                                });
                            }
                        } else {
                            const remainder = credit % savingsProduct.compulsorydepositfrequencyamount;
                            if (remainder !== 0) {
                                transactionStatus = 'FAILED';
                                reasonForRejection = 'Credit amount does not align with compulsory deposit frequency';
                                await handleRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount);
                                await client.query('COMMIT'); // Commit the transaction
                                return res.status(StatusCodes.MISDIRECTED_REQUEST).json({
                                    status: false,
                                    message: 'Credit amount does not align with compulsory deposit frequency. Personal Account credited instead',
                                    statuscode: StatusCodes.MISDIRECTED_REQUEST,
                                    data: null,
                                    errors: ['Credit amount does not align with compulsory deposit frequency. Personal Account credited instead'],
                                });
                            } else {
                                // Get the last transaction on the account
                                const lastTransactionQuery = `
                                    SELECT * FROM divine."transaction"
                                    WHERE accountnumber = $1
                                    ORDER BY transactiondate DESC
                                    LIMIT 1
                                `;
                                const lastTransactionResult = await client.query(lastTransactionQuery, [accountnumber]);
                                let lastTransactionDate = new Date();

                                // If there is a previous transaction, set the lastTransactionDate to the date of that transaction
                                if (lastTransactionResult.rowCount > 0) {
                                    lastTransactionDate = new Date(lastTransactionResult.rows[0].transactiondate);
                                }

                                // Get the transaction period based on the compulsory deposit frequency and the last transaction date
                                const { startDate, endDate } = getTransactionPeriod(savingsProduct.compulsorydepositfrequency, lastTransactionDate);

                                // Check if today's date falls within the calculated transaction period
                                const today = new Date();
                                if (today >= new Date(startDate) && today <= new Date(endDate)) {
                                    const remainder = credit % savingsProduct.compulsorydepositfrequencyamount;

                                    // If the credit amount is a multiple of the compulsory deposit frequency amount, proceed with the payment
                                    if (remainder === 0) {
                                        // Insert the transaction into the database with a status of 'PENDING'
                                        await client.query(
                                            `INSERT INTO divine."transaction" (accountnumber, credit, reference, description, ttype, status, transactiondate, whichaccount) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7)`,
                                            [accountnumber, credit, generateNewReference(transactionReference), description, ttype, today, whichaccount]
                                        );
                                    } else if (remainder > 0) {
                                        // If the credit amount is not a multiple of the compulsory deposit frequency amount and spillover is not allowed, redirect to personal account
                                        if (!savingsProduct.compulsorydepositspillover) {
                                            transactionStatus = 'REDIRECTED';
                                            reasonForRejection = 'Credit amount does not align with compulsory deposit frequency';
                                            await handleRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount);
                                            await client.query('COMMIT'); // Commit the transaction
                                            return res.status(StatusCodes.MISDIRECTED_REQUEST).json({
                                                status: false,
                                                message: 'Credit amount does not align with compulsory deposit frequency. Personal Account credited instead',
                                                statuscode: StatusCodes.MISDIRECTED_REQUEST,
                                                data: null,
                                                errors: ['Credit amount does not align with compulsory deposit frequency. Personal Account credited instead'],
                                            });
                                        } else {
                                            // If spillover is allowed, generate the next dates for the compulsory deposits
                                            const dates = generateNextDates(savingsProduct.compulsorydepositfrequency, remainder, endDate);

                                            // Insert the compulsory deposit transactions for the generated dates
                                            for (const date of dates) {
                                                await client.query(
                                                    `INSERT INTO divine."transaction" (accountnumber, credit, reference, description, ttype, status, transactiondate, whichaccount) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7)`,
                                                    [accountnumber, savingsProduct.compulsorydepositfrequencyamount, generateNewReference(transactionReference), description, ttype, date, whichaccount]
                                                );
                                            }
                                        }
                                    }
                                } else if (today > new Date(endDate)) {
                                    // If today's date is beyond the end date of the transaction period and deficit is allowed, handle future transactions
                                    if (savingsProduct.compulsorydepositdeficit) {
                                        const remainder = credit % savingsProduct.compulsorydepositfrequencyamount;

                                        // Generate the next dates for the compulsory deposits
                                        const dates = generateNextDates(savingsProduct.compulsorydepositfrequency, remainder, endDate);

                                        // Check if any of the generated dates are in the future
                                        if (dates.some(date => new Date(date) > today)) {
                                            if (!savingsProduct.compulsorydepositspillover) {
                                                // If future transactions are not allowed and spillover is not allowed, redirect to personal account
                                                transactionStatus = 'REDIRECTED';
                                                reasonForRejection = 'Future transactions are not allowed';
                                                await handleRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount);
                                                await client.query('COMMIT'); // Commit the transaction
                                                return res.status(StatusCodes.MISDIRECTED_REQUEST).json({
                                                    status: false,
                                                    message: 'Transaction has been redirected to the personal account because future transactions are not allowed.',
                                                    statuscode: StatusCodes.MISDIRECTED_REQUEST,
                                                    data: null,
                                                    errors: ['Future transactions are not allowed. Transaction redirected to personal account.'],
                                                });
                                            } else {
                                                // If future transactions are allowed, insert the compulsory deposit transactions for the generated dates
                                                for (const date of dates) {
                                                    await client.query(
                                                        `INSERT INTO divine."transaction" (accountnumber, credit, reference, description, ttype, status, transactiondate, whichaccount) VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7)`,
                                                        [accountnumber, savingsProduct.compulsorydepositfrequencyamount, generateNewReference(transactionReference), description, ttype, date, whichaccount]
                                                    );
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else if (savingsProduct.compulsorydeposittype === 'MINIMUM') {
                        if (credit < savingsProduct.compulsorydepositfrequencyamount) {
                            transactionStatus = 'FAILED';
                            reasonForRejection = 'Credit amount is less than compulsory deposit amount';
                            await handleRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount);
                            await client.query('COMMIT'); // Commit the transaction
                            return res.status(StatusCodes.BAD_REQUEST).json({
                                status: false,
                                message: 'Credit amount is less than compulsory deposit amount.',
                                statuscode: StatusCodes.BAD_REQUEST,
                                data: null,
                                errors: ['Credit amount is less than compulsory deposit amount.'],
                            });
                        }
                    }
                }

    
                // Credit transaction logic
                const creditTransactionInsertQuery = `
                    INSERT INTO divine."transaction" (accountnumber, credit, reference, description, ttype, status, valuedate, whichaccount) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
                const creditTransactionResult = await client.query(creditTransactionInsertQuery, [
                    accountnumber,
                    credit,
                    transactionReference,
                    description,
                    ttype,
                    transactionStatus,
                    new Date(), // Set the value date to now when transaction becomes active
                    whichaccount
                ]);
    
                 // 8. Handle Deposit Charge
                 if (credit > 0 && savingsProduct.depositcharge) {
                    const chargeAmount = calculateCharge(savingsProduct, credit);
                    await client.query(
                        `INSERT INTO divine."transaction" (accountnumber, debit, description, reference, status, whichaccount) VALUES ($1, $2, $3, $4, 'PENDING', $5)`,
                        [accountnumber, chargeAmount, 'Deposit Charge', generateNewReference(transactionReference), whichaccount]
                    );
                }
    
    
                const creditTransaction = creditTransactionResult.rows[0];
    
                // Handle notifications and tax for credit transaction
                if (creditTransaction.status === 'ACTIVE') {
                    const taxAmount = calculateTax(creditTransaction);
                    await client.query(
                        `UPDATE divine."transaction" SET tax = $1 WHERE reference = $2`,
                        [taxAmount, transactionReference]
                    );
                    await sendNotification(account.user, creditTransaction); // Assume this function exists
                }
            }
    
            if (debit > 0) {
    
                // 9. Debit and Balance Check
                const balanceQuery = `SELECT SUM(credit) - SUM(debit) AS balance FROM divine."transaction" WHERE accountnumber = $1 AND status = 'ACTIVE'`;
                const balanceResult = await client.query(balanceQuery, [accountnumber]);
                const currentBalance = balanceResult.rows[0]?.balance || 0;
                if (savingsProduct.minimumaccountbalance > 0) {
                    if (currentBalance - debit < savingsProduct.minimumaccountbalance) {
                        transactionStatus = savingsProduct.allowoverdrawn ? 'PENDING' : 'FAILED';
                        reasonForPending = 'Insufficient funds or minimum balance exceeded';
                        await savePendingTransaction(client, accountnumber, credit, debit, transactionReference, description, ttype, reasonForPending, 'PENDING DEBIT', whichaccount);
                    }
                }
                // Debit transaction logic
                const debitTransactionInsertQuery = `
                    INSERT INTO divine."transaction" (accountnumber, debit, reference, description, ttype, status, valuedate, whichaccount) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
                const debitTransactionResult = await client.query(debitTransactionInsertQuery, [
                    accountnumber,
                    debit,
                    transactionReference,
                    description,
                    ttype,
                    transactionStatus,
                    new Date(), // Set the value date to now when transaction becomes active
                    whichaccount
                ]);
                const debitTransaction = debitTransactionResult.rows[0];
    
                // Handle notifications and tax for debit transaction
                if (debitTransaction.status === 'ACTIVE') {
                    const taxAmount = calculateTax(debitTransaction);
                    await client.query(
                        `UPDATE divine."transaction" SET tax = $1 WHERE reference = $2`,
                        [taxAmount, transactionReference]
                    );
                    await sendNotification(account.user, debitTransaction); // Assume this function exists
                }
            }

        }

        // Log activity
        await activityMiddleware(req, req.user.id, 'Transaction saved successfully', 'TRANSACTION');

        await client.query('COMMIT'); // Commit the transaction
        res.status(StatusCodes.CREATED).json({ transaction: creditTransaction || debitTransaction });
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback the transaction on error
        console.error('Transaction failed:', error.message);
        
        // Logic to save failed transaction with reason for rejection
        if (reasonForRejection) {
            await saveFailedTransaction(client, req, reasonForRejection, transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
        }

        res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: 'Transaction processing failed.',
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: [error.message],
        });
    } finally {
        client.release(); // Release the client
    }
};

// Function to save failed transaction with reason for rejection
const saveFailedTransaction = async (client, req, reasonForRejection, transactionReference, whichaccount) => {
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount) VALUES ($1, $2, $3, $4, $5, $6, 'FAILED', $7, $8)`,
        [req.body.accountnumber, req.body.credit, req.body.debit, transactionReference, req.body.description, req.body.ttype, reasonForRejection, whichaccount]
    );
    if (req.body.reference) {
        await client.query(
            `UPDATE divine."transaction" SET status = 'FAILED' WHERE reference LIKE $1`,
            [req.body.reference + '%']
        );
    }
};

// Function to save pending transaction with reason for pending
const savePendingTransaction = async (client, accountnumber, credit, debit, transactionReference, description, ttype, reasonForRejection, status, whichaccount, req) => {
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [accountnumber, credit, debit, transactionReference, description, ttype, status, reasonForRejection, whichaccount]
    );
    if (req && req.reference && ttype !== 'CHARGES') {
        await client.query(
            `UPDATE divine."transaction" SET status = 'FAILED' WHERE reference LIKE $1`,
            [req.reference + '%']
        );
    }
};

// Helper function for calculating charges
const calculateCharge = (product, amount) => {
    if (product.depositchargetype === 'PERCENTAGE') {
        return (product.depositcharge / 100) * amount;
    }
    return product.depositcharge;
};

// Helper function for penalty calculation
const calculatePenalty = (product) => {
    if (product.penaltytype === 'PERCENTAGE') {
        return (product.penaltyamount / 100) * product.compulsorydepositfrequencyamount;
    }
    return product.penaltyamount;
};

// Helper function for calculating tax
const calculateTax = (transaction) => {
    // Define your tax calculation logic here
    return 0; // Replace with actual logic
};

// Example of generating a new reference
const generateNewReference = (reference) => {
    return `${reference}`+'-'+`${new Date().getTime()}`; // Append timestamp to create a unique reference
};

// Example of sending notifications
const sendNotification = async (user, transaction) => {
    // Implement your notification logic here
};

// Example function to handle excess account logic
const handleRedirectToPersonnalAccount = async (client, req, accountuser, reference, transactiondesc, whichaccount) => {
    // Implement logic for handling excess accounts
    // save the transaction as redirect
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [req.body.accountnumber, req.body.credit, req.body.debit, generateNewReference(reference), req.body.description, req.body.ttype, 'REDIRECTED', transactiondesc, whichaccount]
    );

    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.body.personnalaccountnumber, req.body.credit, req.body.debit, generateNewReference(reference), req.body.description, req.body.ttype, 'ACTIVE', `Credit was to ${req.body.accountnumber}`, whichaccount]
    );
    
};

// Example function to generate dates for compulsory deposits
// const generateDates = () => {
//     // Implement logic to generate dates
//     return { lastDate: new Date(), nextDate: new Date() }; // Replace with actual logic
// };

module.exports = saveTransactionMiddleware;