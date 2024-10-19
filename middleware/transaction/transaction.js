const pg = require('../../db/pg'); // Use your existing pg setup
const { StatusCodes } = require('http-status-codes'); // Assuming you are using http-status-codes for status codes
const activityMiddleware = require('../activity'); // Import activity middleware
const { 
    saveFailedTransaction, 
    savePendingTransaction, 
    saveTransaction, 
    calculateCharge, 
    calculatePenalty, 
    calculateTax, 
    generateNewReference, 
    sendNotification, 
    handleCreditRedirectToPersonnalAccount 
} = require('./helper'); // Import all helper functions

// Middleware function to save a transaction
const saveTransactionMiddleware = async (req, res, next) => {
    let user = req.user;
    const client = pg
    try {
        await client.query('BEGIN'); // Start a transaction
        await activityMiddleware(req, req.user.id, 'Transaction started', 'TRANSACTION');

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
            await activityMiddleware(req, req.user.id, 'Transaction rolled back due to missing organisation settings', 'TRANSACTION');
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
                await activityMiddleware(req, req.user.id, 'Transaction rolled back due to invalid account number', 'TRANSACTION');
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
            await activityMiddleware(req, req.user.id, 'Transaction committed after invalid personnal account number', 'TRANSACTION');
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
            req.body['accontuser'] = accountuser.id;
        }

        const account = accountResult.rows[0];
        if (account.status !== 'ACTIVE') {
            await saveFailedTransaction(client, req, 'Account is not active.', transactionReference, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            await activityMiddleware(req, req.user.id, 'Transaction committed after inactive account', 'TRANSACTION');
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
            await activityMiddleware(req, req.user.id, 'Transaction committed after invalid savings product', 'TRANSACTION');
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
            await activityMiddleware(req, req.user.id, 'Transaction committed after inactive savings product', 'TRANSACTION');
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
            await activityMiddleware(req, req.user.id, 'Transaction committed after invalid credit and debit', 'TRANSACTION');
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
            await activityMiddleware(req, req.user.id, 'Transaction committed after currency mismatch', 'TRANSACTION');
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
            await activityMiddleware(req, req.user.id, 'Transaction committed after back-dated transaction', 'TRANSACTION');
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
            await activityMiddleware(req, req.user.id, 'Transaction committed after future transaction', 'TRANSACTION');
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
            await activityMiddleware(req, req.user.id, 'Transaction committed after rejected date', 'TRANSACTION');
            return res.status(StatusCodes.FAILED_DEPENDENCY).json({
                status: false,
                message: 'Transaction failed due to rejected date.',
                statuscode: StatusCodes.FAILED_DEPENDENCY,
                data: null,
                errors: ['Transaction date is a rejected date.'],
            });
        }

        if(whichaccount === 'SAVINGS'){

            if (credit < orgSettings.minimum_credit_amount) {
                const penaltyAmount = orgSettings.minimum_credit_amount_penalty;
                const transactionParams = {
                    accountnumber: accountnumber,
                    debit: penaltyAmount,
                    description: 'Minimum Credit Amount Penalty',
                    reference: generateNewReference(transactionReference),
                    status: 'PENDING PENALTY',
                    transactiondesc: 'PENALTY',
                    whichaccount: 'PERSONAL'
                };
                await savePendingTransaction(client, transactionParams, req);
                await activityMiddleware(req, req.user.id, 'Pending penalty transaction saved', 'TRANSACTION');
            }
            
            // Group transactions based on credit and debit
            if (credit > 0) {

                // 8. Handle Deposit Charge
                if (credit > 0 && savingsProduct.depositcharge) {
                    const chargeAmount = calculateCharge(savingsProduct, credit);
                    const transactionParams = {
                        accountnumber: accountnumber,
                        debit: chargeAmount,
                        description: 'Deposit Charge',
                        reference: generateNewReference(transactionReference),
                        status: 'PENDING CHARGE',
                        transactiondesc: 'CHARGE',
                        whichaccount: whichaccount
                    };
                    await savePendingTransaction(client, transactionParams, req);
                    await activityMiddleware(req, req.user.id, 'Pending deposit charge transaction saved', 'TRANSACTION');
                }
    
                // 7. Savings Product Rules - Allow Deposit
                if (credit > 0 && !savingsProduct.allowdeposit) {
                    transactionStatus = 'REDIRECTED';
                    reasonForRejection = 'Deposits not allowed on this product';
                    // Handle redirection to excess account logic
                    await handleCreditRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount);
                    await client.query('COMMIT'); // Commit the transaction
                    await activityMiddleware(req, req.user.id, 'Transaction committed after deposit not allowed', 'TRANSACTION');
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
                    if (credit < savingsProduct.compulsorydepositfrequencyamount) {
                        transactionStatus = 'FAILED';
                        reasonForRejection = 'Credit amount is less than compulsory deposit amount';
                        await handleCreditRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount);
                        await client.query('COMMIT'); // Commit the transaction
                        await activityMiddleware(req, req.user.id, 'Transaction committed after compulsory deposit amount not met', 'TRANSACTION');
                        return res.status(StatusCodes.BAD_REQUEST).json({
                            status: false,
                            message: 'Credit amount is less than compulsory deposit amount.',
                            statuscode: StatusCodes.BAD_REQUEST,
                            data: null,
                            errors: ['Credit amount is less than compulsory deposit amount.'],
                        });
                    }
                    // Calculate the remainder when the credit amount is divided by the compulsory deposit frequency amount
                    const remainder = credit % savingsProduct.compulsorydepositfrequencyamount;
                    // Check if the compulsory deposit type is 'FIXED'
                            if (remainder !== 0 && savingsProduct.compulsorydeposittype === 'FIXED') {
                                transactionStatus = 'REDIRECTED';
                                reasonForRejection = 'Credit amount does not align with compulsory deposit frequency';
                                await handleCreditRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount);
                                await client.query('COMMIT'); // Commit the transaction
                                await activityMiddleware(req, req.user.id, 'Transaction committed after compulsory deposit frequency not met', 'TRANSACTION');
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
                                    WHERE accountnumber = $1 AND status = 'ACTIVE'
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
                                const isWithinPeriod = today >= new Date(startDate) && today <= new Date(endDate);
                                const multipleOfFrequency = Math.floor(credit / savingsProduct.compulsorydepositfrequencyamount);

                                if (isWithinPeriod) {
                                    const dates = generateNextDates(savingsProduct.compulsorydepositfrequency, multipleOfFrequency, endDate);
                                    const futureDates = dates.filter(date => new Date(date) >= today);

                                    if (futureDates.length > 0 && !savingsProduct.compulsorydepositspillover) {
                                        transactionStatus = 'REDIRECTED';
                                        reasonForRejection = 'Future transactions are not allowed and spillover is false';
                                        await handleCreditRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount, credit);
                                        await client.query('COMMIT'); // Commit the transaction
                                        await activityMiddleware(req, req.user.id, 'Transaction committed after future transactions not allowed', 'TRANSACTION');
                                        return res.status(StatusCodes.MISDIRECTED_REQUEST).json({
                                            status: false,
                                            message: 'Future transactions are not allowed and spillover is false. Personal Account credited instead',
                                            statuscode: StatusCodes.MISDIRECTED_REQUEST,
                                            data: null,
                                            errors: ['Future transactions are not allowed and spillover is false. Personal Account credited instead'],
                                        });
                                    } else if (futureDates.length > 0 && savingsProduct.compulsorydepositspillover) {
                                        for (const date of dates) {
                                            const transactionData = {
                                                accountnumber: accountnumber,
                                                credit: savingsProduct.compulsorydepositfrequencyamount,
                                                reference: generateNewReference(transactionReference),
                                                description: description,
                                                ttype: ttype,
                                                status: 'ACTIVE',
                                                transactiondate: date,
                                                whichaccount
                                            };
                                            await saveTransaction(client, transactionData, req);
                                            await activityMiddleware(req, req.user.id, 'Transaction saved for future date', 'TRANSACTION');
                                        }
                                    }
                                } else {
                                    const dates = generateNextDates(savingsProduct.compulsorydepositfrequency, multipleOfFrequency, endDate);
                                    const pastDates = dates.filter(date => new Date(date) < today);
                                    const futureDates = dates.filter(date => new Date(date) >= today);

                                    if (!savingsProduct.compulsorydepositdeficit && !savingsProduct.compulsorydepositspillover) {
                                        // Make payment for only this month and redirect the rest to personal account
                                        const currentDate = new Date();
                                        const currentTransactionData = {
                                            accountnumber: accountnumber,
                                            credit: savingsProduct.compulsorydepositfrequencyamount,
                                            reference: generateNewReference(transactionReference),
                                            description: description,
                                            ttype: ttype,
                                            status: 'ACTIVE',
                                            transactiondate: currentDate,
                                            whichaccount
                                        };
                                        await saveTransaction(client, currentTransactionData, req);
                                        await activityMiddleware(req, req.user.id, 'Transaction saved for current period', 'TRANSACTION');

                                        const remainingBalance = credit - savingsProduct.compulsorydepositfrequencyamount;
                                        if (remainingBalance > 0) {
                                            transactionStatus = 'REDIRECTED';
                                            reasonForRejection = 'Remaining balance redirected to personal account';
                                            await handleCreditRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount, remainingBalance);
                                            await client.query('COMMIT'); // Commit the transaction
                                            await activityMiddleware(req, req.user.id, 'Transaction committed after redirecting remaining balance', 'TRANSACTION');
                                            return res.status(StatusCodes.MISDIRECTED_REQUEST).json({
                                                status: false,
                                                message: 'Remaining balance redirected to personal account.',
                                                statuscode: StatusCodes.MISDIRECTED_REQUEST,
                                                data: null,
                                                errors: ['Remaining balance redirected to personal account.'],
                                            });
                                        }
                                    } else if (savingsProduct.compulsorydepositdeficit && !savingsProduct.compulsorydepositspillover) {
                                        // Pay for only past and current period then calculate the remaining balance and pay to personal account
                                        for (const date of pastDates) {
                                            const transactionData = {
                                                accountnumber: accountnumber,
                                                credit: savingsProduct.compulsorydepositfrequencyamount,
                                                reference: generateNewReference(transactionReference),
                                                description: description,
                                                ttype: ttype,
                                                status: 'ACTIVE',
                                                transactiondate: date,
                                                whichaccount
                                            };
                                            await saveTransaction(client, transactionData, req);
                                            await activityMiddleware(req, req.user.id, 'Transaction saved for past period', 'TRANSACTION');
                                        }

                                        // Make payment for the current period
                                        // const currentDate = new Date();
                                        // const currentTransactionData = {
                                        //     accountnumber: accountnumber,
                                        //     credit: savingsProduct.compulsorydepositfrequencyamount,
                                        //     reference: generateNewReference(transactionReference),
                                        //     description: description,
                                        //     ttype: ttype,
                                        //     status: 'ACTIVE',
                                        //     transactiondate: currentDate,
                                        //     whichaccount
                                        // };
                                        // await saveTransaction(client, currentTransactionData, req);

                                    

                                        const remainingBalance = credit - (savingsProduct.compulsorydepositfrequencyamount * (pastDates.length));
                                        if (remainingBalance > 0) {
                                            transactionStatus = 'REDIRECTED';
                                            reasonForRejection = 'Remaining balance redirected to personal account';
                                            await handleCreditRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount, remainingBalance);
                                            await client.query('COMMIT'); // Commit the transaction
                                            await activityMiddleware(req, req.user.id, 'Transaction committed after redirecting remaining balance', 'TRANSACTION');
                                            return res.status(StatusCodes.MISDIRECTED_REQUEST).json({
                                                status: false,
                                                message: 'Remaining balance redirected to personal account.',
                                                statuscode: StatusCodes.MISDIRECTED_REQUEST,
                                                data: null,
                                                errors: ['Remaining balance redirected to personal account.'],
                                            });
                                        }
                                    } else if (!savingsProduct.compulsorydepositdeficit && savingsProduct.compulsorydepositspillover) {
                                        // Recalculate new dates starting from the current period and then make the payments
                                        const newDates = generateNextDates(savingsProduct.compulsorydepositfrequency, multipleOfFrequency, today);
                                        for (const date of newDates) {
                                            const transactionData = {
                                                accountnumber: accountnumber,
                                                credit: savingsProduct.compulsorydepositfrequencyamount,
                                                reference: generateNewReference(transactionReference),
                                                description: description,
                                                ttype: ttype,
                                                status: 'ACTIVE',
                                                transactiondate: date,
                                                whichaccount
                                            };
                                            await saveTransaction(client, transactionData, req);
                                            await activityMiddleware(req, req.user.id, 'Transaction saved for new date', 'TRANSACTION');
                                        }
                                    } else if (savingsProduct.compulsorydepositdeficit && savingsProduct.compulsorydepositspillover) {
                                        // Map the past and future dates and make the payments
                                        // const futureDates = generateNextDates(savingsProduct.compulsorydepositfrequency, multipleOfFrequency, today);
                                        const allDates = [...pastDates, ...futureDates];
                                        for (const date of allDates) {
                                            const transactionData = {
                                                accountnumber: accountnumber,
                                                credit: savingsProduct.compulsorydepositfrequencyamount,
                                                reference: generateNewReference(transactionReference),
                                                description: description,
                                                ttype: ttype,
                                                status: 'ACTIVE',
                                                transactiondate: date,
                                                whichaccount
                                            };
                                            await saveTransaction(client, transactionData, req);
                                            await activityMiddleware(req, req.user.id, 'Transaction saved for all dates', 'TRANSACTION');
                                        }
                                        const remainingBalance = credit - (savingsProduct.compulsorydepositfrequencyamount * allDates.length);
                                        if (remainingBalance > 0) {
                                            transactionStatus = 'REDIRECTED';
                                            reasonForRejection = 'Remaining balance redirected to personal account';
                                            await handleCreditRedirectToPersonnalAccount(client, req, accountuser, transactionReference, reasonForRejection, whichaccount, remainingBalance);
                                            await client.query('COMMIT'); // Commit the transaction
                                            await activityMiddleware(req, req.user.id, 'Transaction committed after redirecting remaining balance', 'TRANSACTION');
                                            return res.status(StatusCodes.MISDIRECTED_REQUEST).json({
                                                status: false,
                                                message: 'Remaining balance redirected to personal account.',
                                                statuscode: StatusCodes.MISDIRECTED_REQUEST,
                                                data: null,
                                                errors: ['Remaining balance redirected to personal account.'],
                                            });
                                        }
                                    }
                                }
                            }
                    
                }

    
                // Credit transaction logic
                // const creditTransactionInsertQuery = `
                //     INSERT INTO divine."transaction" (accountnumber, credit, reference, description, ttype, status, valuedate, whichaccount) 
                //     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
                // const creditTransactionResult = await client.query(creditTransactionInsertQuery, [
                //     accountnumber,
                //     credit,
                //     transactionReference,
                //     description,
                //     ttype,
                //     transactionStatus,
                //     new Date(), // Set the value date to now when transaction becomes active
                //     whichaccount
                // ]);
    
                //  // 8. Handle Deposit Charge
                //  if (credit > 0 && savingsProduct.depositcharge) {
                //     const chargeAmount = calculateCharge(savingsProduct, credit);
                //     await client.query(
                //         `INSERT INTO divine."transaction" (accountnumber, debit, description, reference, status, whichaccount) VALUES ($1, $2, $3, $4, 'PENDING', $5)`,
                //         [accountnumber, chargeAmount, 'Deposit Charge', generateNewReference(transactionReference), whichaccount]
                //     );
                // }
    
    
                // const creditTransaction = creditTransactionResult.rows[0];
    
                // // Handle notifications and tax for credit transaction
                // if (creditTransaction.status === 'ACTIVE') {
                //     const taxAmount = calculateTax(creditTransaction);
                //     await client.query(
                //         `UPDATE divine."transaction" SET tax = $1 WHERE reference = $2`,
                //         [taxAmount, transactionReference]
                //     );
                //     await sendNotification(account.user, creditTransaction); // Assume this function exists
                // }
            }
    
            if (debit > 0) {
    
                // 9. Debit and Balance Check
                // Query to calculate the current balance by subtracting the sum of debits from the sum of credits for the given account number
                const balanceQuery = `SELECT SUM(credit) - SUM(debit) AS balance FROM divine."transaction" WHERE accountnumber = $1 AND status = 'ACTIVE'`;
                const balanceResult = await client.query(balanceQuery, [accountnumber]);
                const currentBalance = balanceResult.rows[0]?.balance || 0; // Get the current balance or default to 0 if no result

                // Check if the transaction description is not 'CHARGE'
                if (transactiondesc != 'CHARGE') {
                    // Check if the debit amount exceeds the withdrawal limit
                    if (savingsProduct.withdrawallimit > 0 && debit > savingsProduct.withdrawallimit) {
                        tranactionStatus = 'FAILED'; // Set transaction status to 'FAILED'
                        reasonForRejection = 'Withdrawal limit exceeded'; // Set reason for rejection
                        await saveFailedTransaction(client, req, reasonForRejection, transactionReference, whichaccount); // Save the failed transaction
                        await client.query('COMMIT'); // Commit the transaction
                        await activityMiddleware(req, req.user.id, 'Transaction failed due to withdrawal limit exceeded', 'TRANSACTION'); // Log activity
                        return res.status(StatusCodes.BAD_REQUEST).json({
                            status: false,
                            message: 'Transaction failed due to withdrawal limit exceeded.',
                            statuscode: StatusCodes.BAD_REQUEST,
                            data: null,
                            errors: ['Withdrawal limit exceeded.'],
                        }); // Return a response
                    } 
                    // Check if there is a withdrawal charge applicable
                    if (savingsProduct.withdrawalcharge > 0) {
                        const chargeAmount = calculateCharge(savingsProduct, debit); // Calculate the charge amount
                        const transactionParams = {
                            accountnumber: accountnumber,
                            debit: chargeAmount,
                            description: 'Withdrawal Charge',
                            reference: generateNewReference(transactionReference),
                            status: 'PENDING',
                            whichaccount: whichaccount
                        };
                        await saveTransaction(client, transactionParams, req); // Call the saveTransaction function
                        await activityMiddleware(req, req.user.id, 'Pending withdrawal charge transaction saved', 'TRANSACTION'); // Log activity
                    }
                    // Check if there is a minimum account balance requirement
                    if (savingsProduct.minimumaccountbalance > 0) {
                        // Check if the current balance after the debit would be less than the minimum account balance
                        if (currentBalance - debit < savingsProduct.minimumaccountbalance) {
                            transactionStatus = savingsProduct.allowoverdrawn ? 'PENDING' : 'FAILED'; // Set transaction status based on whether overdrawn is allowed
                            reasonForPending = 'Insufficient funds or minimum balance exceeded'; // Set reason for pending status
                            await savePendingTransaction(client, accountnumber, credit, debit, transactionReference, description, ttype, reasonForPending, 'PENDING DEBIT', whichaccount); // Save the pending transaction
                            await activityMiddleware(req, req.user.id, 'Pending debit transaction saved due to insufficient funds or minimum balance exceeded', 'TRANSACTION'); // Log activity
                        }
                    }
                }


                // Debit transaction logic
                const transactionParams = {
                    accountnumber: accountnumber,
                    debit: debit,
                    reference: transactionReference,
                    description: description,
                    ttype: ttype,
                    status: transactionStatus,
                    valuedate: new Date(), // Set the value date to now when transaction becomes active
                    whichaccount: whichaccount
                };
                await saveTransaction(client, transactionParams, req);
                await activityMiddleware(req, req.user.id, 'Debit transaction saved successfully', 'TRANSACTION'); // Log activity
                // const debitTransaction = debitTransactionResult.rows[0];
    
                // // Handle notifications and tax for debit transaction
                // if (debitTransaction.status === 'ACTIVE') {
                //     const taxAmount = calculateTax(debitTransaction);
                //     await client.query(
                //         `UPDATE divine."transaction" SET tax = $1 WHERE reference = $2`,
                //         [taxAmount, transactionReference]
                //     );
                //     await sendNotification(account.user, debitTransaction); // Assume this function exists
                // }
            }

        }

        // Log activity
        await activityMiddleware(req, req.user.id, 'Transaction saved successfully', 'TRANSACTION');

        await client.query('COMMIT'); // Commit the transaction
        // res.status(StatusCodes.CREATED).json({ transaction: creditTransaction || debitTransaction });
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



module.exports = saveTransactionMiddleware;