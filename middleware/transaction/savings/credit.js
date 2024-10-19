const { StatusCodes } = require('http-status-codes');
const { saveFailedTransaction, savePendingTransaction, handleCreditRedirectToPersonnalAccount, activityMiddleware, calculateCharge, generateNewReference } = require('../../helper');




async function handleCreditTransaction(client, req, accountnumber, credit, transactionReference, description, ttype, transactionStatus, savingsProduct, whichaccount, accountuser){
    

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
            
};

// 11. Export the handleCreditTransaction function
module.exports = {
    handleCreditTransaction
};
