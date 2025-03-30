const { StatusCodes } = require('http-status-codes');
const { saveFailedTransaction, savePendingTransaction, handleCreditRedirectToPersonalAccount, calculateCharge, generateNewReference, handleCreditRedirectToPersonnalAccount, saveTransaction, applyMinimumCreditAmountPenalty, applySavingsCharge } = require('../../../utils/transactionHelper');
const { activityMiddleware } = require('../../activity');
const { getTransactionPeriod, generateNextDates } = require('../../../utils/datecode');




async function savingsCredit(client, req, res, next, accountnumber, credit, description, ttype, transactionStatus, savingsProduct, whichaccount, accountuser){
    console.log("Entered savingsCredit function with credit:", credit);
    if (credit > 0) { 

        // apply check for minimum credit and penalty
        await applyMinimumCreditAmountPenalty(client, req, res, req.orgSettings);


        // 8. Handle Deposit Charge
        if (credit > 0 && savingsProduct.depositcharge) {
            console.log("Handling deposit charge for credit:", credit);
            await applySavingsCharge(client, req, res, accountnumber, credit, whichaccount);
        }
        console.log('it left the charge area')
        // 7. Savings Product Rules - Allow Deposit
        if (credit > 0 && !savingsProduct.allowdeposit) {
            console.log("Deposits not allowed on this product, redirecting transaction.");
            transactionStatus = 'REDIRECTED';
            reasonForRejection = 'Deposits not allowed on this product';
            // Handle redirection to excess account logic
            await handleCreditRedirectToPersonnalAccount(client, req, res, accountuser, generateNewReference(client, accountnumber, req, res), reasonForRejection, whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            await activityMiddleware(req, req.user.id, 'Transaction committed after deposit not allowed', 'TRANSACTION');
            req.transactionError = {
                status: StatusCodes.MISDIRECTED_REQUEST,
                message: 'Transaction has been redirected to the personal account because the savings account is restricted from taking deposits.',
                errors: ['Deposits not allowed on this product. Transaction redirected to personal account.']
            };
            req.body.transactiondesc += 'Deposits not allowed on this product.|';
            return next();
        }

        //  // 7. Savings Product Rules - Allow Deposit
        //  if (credit > 0 && !savingsProduct.allowdeposit) {
        //     console.log("Deposits not allowed on this product, redirecting transaction.");
        //     transactionStatus = 'REDIRECTED';
        //     reasonForRejection = 'Deposits not allowed on this product';
        //     // Handle redirection to excess account logic
        //     await handleCreditRedirectToPersonnalAccount(client, req, res, accountuser, await generateNewReference(client, accountnumber, req, res), reasonForRejection, whichaccount);
        //     await client.query('COMMIT'); // Commit the transaction
        //     await activityMiddleware(req, req.user.id, 'Transaction committed after deposit not allowed', 'TRANSACTION');
        //     req.transactionError = {
        //         status: StatusCodes.MISDIRECTED_REQUEST,
        //         message: 'Transaction has been redirected to the personal account because the savings account is restricted from taking deposits.',
        //         errors: ['Deposits not allowed on this product. Transaction redirected to personal account.']
        //     };
        //     req.body.transactiondesc += 'Deposits not allowed on this product.|';
        //     return next();
        // }

        // **9. Check Max Balance Limit (Added this block)**
        if (credit > 0 && savingsProduct.maxbalance) {
            console.log("Checking max balance limit.");
            // Get the current balance
            const balanceQuery = `
                SELECT COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) AS balance
                FROM divine."transaction"
                WHERE accountnumber = $1 AND status = 'ACTIVE'
            `;
            const balanceResult = await client.query(balanceQuery, [accountnumber]);
            const currentBalance = parseFloat(balanceResult.rows[0].balance);
            console.log("Current balance:", currentBalance);
            // Check if adding the credit would reach or exceed maxbalance
            if (currentBalance + credit >= savingsProduct.maxbalance) {
                console.log("Max balance reached or exceeded. Redirecting to personal account.");
                transactionStatus = 'REDIRECTED';
                const reasonForRejection = 'Max balance reached or exceeded';
                await handleCreditRedirectToPersonnalAccount(
                    client,
                    req,
                    res,
                    accountuser,
                    await generateNewReference(client, accountnumber, req, res),
                    reasonForRejection,
                    whichaccount,
                    credit // Amount to redirect
                );
                await client.query('COMMIT'); // Commit the transaction
                await activityMiddleware(
                    req,
                    req.user.id,
                    'Transaction committed after max balance reached or exceeded',
                    'TRANSACTION'
                );
                req.transactionError = {
                    status: StatusCodes.MISDIRECTED_REQUEST,
                    message: 'Transaction has been redirected to the personal account because the savings account has reached its maximum balance limit.',
                    errors: ['Max balance reached or exceeded. Transaction redirected to personal account.']
                };
                req.body.transactiondesc += 'Max balance reached or exceeded.|';
                return next();
            }
        }

        // 10. Compulsory Deposit Logic
        if (savingsProduct.compulsorydeposit) {
            console.log("Handling compulsory deposit logic.");

            // 1. Determine whether backdated or future transactions are allowed
            const allowBackDated = savingsProduct.allow_back_dated_transaction === 'YES';
            const allowFuture = savingsProduct.allow_future_transaction === 'YES';

            // 2. Check if credit is less than the compulsory deposit amount
            if (credit < savingsProduct.compulsorydepositfrequencyamount) {
                console.log("Credit amount is less than compulsory deposit amount.");
                transactionStatus = 'FAILED';
                reasonForRejection = 'Credit amount is less than compulsory deposit amount';
                await handleCreditRedirectToPersonnalAccount(
                    client,
                    req,
                    res,
                    accountuser,
                    generateNewReference(client, accountnumber, req, res),
                    reasonForRejection,
                    whichaccount
                );
                await client.query('COMMIT'); // Commit the transaction
                await activityMiddleware(
                    req,
                    req.user.id,
                    'Transaction committed after compulsory deposit amount not met',
                    'TRANSACTION'
                );
                req.transactionError = {
                    status: StatusCodes.EXPECTATION_FAILED,
                    message: 'Credit amount is less than compulsory deposit amount.',
                    errors: ['Credit amount is less than compulsory deposit amount.']
                };
                req.body.transactiondesc += 'Credit amount is less than compulsory deposit amount.|';
                return next();
            }

            // 3. Calculate the remainder
            const remainder = credit % savingsProduct.compulsorydepositfrequencyamount;
            console.log("Calculated remainder for compulsory deposit:", remainder);

            // 4. Get the last transaction on the account
            const lastTransactionQuery = `
                SELECT *
                FROM divine."transaction"
                WHERE accountnumber = $1 AND status = 'ACTIVE'
                ORDER BY transactiondate DESC
                LIMIT 1
            `;
            const lastTransactionResult = await client.query(lastTransactionQuery, [accountnumber]);

            // Also pull all existing active transactions for date-level checks
            const existingTransQuery = `
                SELECT transactiondate
                FROM divine."transaction"
                WHERE accountnumber = $1
                  AND status = 'ACTIVE'
            `;
            const { rows: existingTransactions } = await client.query(existingTransQuery, [accountnumber]);
            const hasTransactionOnThatDate = (someDate) => {
                const compareDay = new Date(someDate).toDateString();
                return existingTransactions.some(
                    (row) => new Date(row.transactiondate).toDateString() === compareDay
                );
            };

            // 5. Determine the last transaction date
            const lastDates = generateNextDates(savingsProduct.compulsorydepositfrequency, -2);
            console.log("Last transaction dates:", lastDates);
            const lastDate = lastDates[lastDates.length - 1];
            let lastTransactionDate = new Date(new Date(lastDate).setDate(new Date(lastDate).getDate() - 1));
            console.log("Last transaction date (initial):", lastTransactionDate);

            if (lastTransactionResult.rowCount > 0) {
                lastTransactionDate = new Date(lastTransactionResult.rows[0].transactiondate);
                console.log("Last transaction date (from DB):", lastTransactionDate);
            }

            // 6. Get transaction period based on compulsory deposit frequency
            const { startDate, endDate: periodEnd } = getTransactionPeriod(
                savingsProduct.compulsorydepositfrequency,
                lastTransactionDate
            );
            console.log("Transaction period from", startDate, "to", periodEnd);

            // 7. Check if today's date falls within the calculated transaction period
            const today = new Date();
            const isWithinPeriod = today >= new Date(startDate) && today <= new Date(periodEnd);
            console.log("Is today within the transaction period?", isWithinPeriod);

            // 8. Determine multiple of frequency
            const multipleOfFrequency = Math.floor(
                credit / savingsProduct.compulsorydepositfrequencyamount
            );
            console.log("Multiple of frequency amount:", multipleOfFrequency);

            // 9. Generate all relevant dates based on the frequency
            const allDates = generateNextDates(
                savingsProduct.compulsorydepositfrequency,
                multipleOfFrequency,
                periodEnd
            );
            console.log("All calculated dates:", allDates);

            // 10. Separate past and future dates
            const pastDates = allDates.filter(date => new Date(date) < today);
            const futureDates = allDates.filter(date => new Date(date) > today);
            console.log("Past dates:", pastDates, "Future dates:", futureDates);

            // 11. Enforce rules around backdated/future-dated transactions
            //     If NOT allowed, exclude them from distribution
            const validPastDates = allowBackDated ? pastDates : [];
            const validFutureDates = allowFuture ? futureDates : [];

            // 12. Check if there's already a transaction in the current period
            const hasTransactionThisPeriod = lastTransactionResult.rows.some(row => {
                const rowDate = new Date(row.transactiondate);
                return rowDate >= new Date(startDate) && rowDate <= new Date(periodEnd);
            });

            // 13. If there's no transaction in this period, post one chunk for this period
            //     unless there's already a transaction on the exact date we intend to post
            let remainingBalance = credit;
            if (!hasTransactionThisPeriod) {
                console.log("No payment found for the current period. Attempting to pay one frequency amount.");
                if (remainingBalance >= savingsProduct.compulsorydepositfrequencyamount) {
                    const periodDate = isWithinPeriod ? today : periodEnd;
                    // Check if we already posted on periodDate
                    if (hasTransactionOnThatDate(periodDate)) {
                        console.log("A transaction already exists for this period date. Skipping posting for this period.");
                    } else {
                        const transactionData = {
                            accountnumber,
                            credit: savingsProduct.compulsorydepositfrequencyamount,
                            reference: generateNewReference(client, accountnumber, req, res),
                            description,
                            ttype,
                            status: 'ACTIVE',
                            transactiondate: periodDate,
                            whichaccount
                        };
                        await saveTransaction(client, res, transactionData, req);
                        await activityMiddleware(
                            req.user.id,
                            'Transaction posted for current period (one chunk)',
                            'TRANSACTION'
                        );
                        remainingBalance -= savingsProduct.compulsorydepositfrequencyamount;
                    }
                } else {
                    console.log("Not enough credit to pay one frequency chunk for the period. Redirecting to personal account.");
                    transactionStatus = 'REDIRECTED';
                    reasonForRejection = 'Remaining balance redirected to personal account - insufficient for period chunk';
                    await handleCreditRedirectToPersonnalAccount(
                        client,
                        req,
                        res,
                        accountuser,
                        generateNewReference(client, accountnumber, req, res),
                        reasonForRejection,
                        whichaccount,
                        remainingBalance
                    );
                    await client.query('COMMIT');
                    await activityMiddleware(
                        req,
                        req.user.id,
                        'Transaction committed after not enough funds for one chunk in current period',
                        'TRANSACTION'
                    );
                    req.transactionError = {
                        status: StatusCodes.MISDIRECTED_REQUEST,
                        message: 'Remaining balance redirected to personal account.',
                        errors: ['Not enough credit for one chunk in current period.']
                    };
                    req.body.transactiondesc += 'Not enough credit for one chunk in current period.|';
                    return next();
                }
            }

            // 14. Proceed with normal distribution logic if we still have leftover
            //     Also check if there's already a transaction for 'today' to avoid double-posting
            const hasTransactionToday = hasTransactionOnThatDate(today);

            if (hasTransactionToday) {
                // If the current day already has a transaction, redirect leftover
                if (remainingBalance > 0) {
                    console.log("Today's date already has a transaction. Redirecting leftover to personal account.");
                    transactionStatus = 'REDIRECTED';
                    reasonForRejection = 'A transaction already exists for today, leftover is redirected';
                    await handleCreditRedirectToPersonnalAccount(
                        client,
                        req,
                        res,
                        accountuser,
                        generateNewReference(client, accountnumber, req, res),
                        reasonForRejection,
                        whichaccount,
                        remainingBalance
                    );
                }
                await client.query('COMMIT');
                await activityMiddleware(
                    req,
                    req.user.id,
                    'Transaction committed after discovering a transaction on today, leftover redirected',
                    'TRANSACTION'
                );
                req.transactionError = {
                    status: StatusCodes.MISDIRECTED_REQUEST,
                    message: 'Leftover redirected because there is already a transaction today.',
                    errors: ['Already transacted today.']
                };
                req.body.transactiondesc += 'Leftover redirected because there is already a transaction today.|';
                return next();
            }

            console.log("Handling distribution logic for compulsory deposit type:", savingsProduct.compulsorydeposittype);

            if (remainingBalance <= 0) {
                // All funds used or posted
                await client.query('COMMIT');
                await activityMiddleware(
                    req.user.id,
                    'All funds for compulsory deposit have been posted or redirected',
                    'TRANSACTION'
                );
                return next();
            }

            // ---------------------------------------------------------------------
            // FIXED Type Distribution
            // ---------------------------------------------------------------------
            if (savingsProduct.compulsorydeposittype === 'FIXED') {
                console.log("Handling FIXED compulsory deposit type.");

                // Distribute deposits to each valid date (past or future if allowed) in freq increments
                for (const date of allDates) {
                    const dateObj = new Date(date);

                    // Skip if date is in the past and not allowed
                    if (dateObj < today && !allowBackDated) continue;
                    // Skip if date is in the future and not allowed
                    if (dateObj > today && !allowFuture) continue;
                    // Skip if there's already a transaction on that day
                    if (hasTransactionOnThatDate(dateObj)) {
                        console.log(`A transaction is already posted on ${dateObj}. Skipping this date.`);
                        continue;
                    }

                    if (remainingBalance >= savingsProduct.compulsorydepositfrequencyamount) {
                        const transactionData = {
                            accountnumber,
                            credit: savingsProduct.compulsorydepositfrequencyamount,
                            reference: generateNewReference(client, accountnumber, req, res),
                            description,
                            ttype,
                            status: 'ACTIVE',
                            transactiondate: date,
                            whichaccount
                        };
                        await saveTransaction(client, res, transactionData, req);
                        await activityMiddleware(
                            req.user.id,
                            `Transaction saved for FIXED type on ${date}`,
                            'TRANSACTION'
                        );
                        remainingBalance -= savingsProduct.compulsorydepositfrequencyamount;
                    } else {
                        break; // Not enough funds to allocate another chunk
                    }
                }

                console.log("Remaining balance after FIXED deposits:", remainingBalance);
                // Redirect any leftover to personal account
                if (remainingBalance > 0) {
                    console.log("Redirecting remaining balance to personal account (FIXED).");
                    transactionStatus = 'REDIRECTED';
                    reasonForRejection = 'Remaining balance redirected to personal account (FIXED)';
                    await handleCreditRedirectToPersonnalAccount(
                        client,
                        req,
                        res,
                        accountuser,
                        generateNewReference(client, accountnumber, req, res),
                        reasonForRejection,
                        whichaccount,
                        remainingBalance
                    );
                    await client.query('COMMIT');
                    await activityMiddleware(
                        req,
                        req.user.id,
                        'Transaction committed after redirecting remaining balance (FIXED)',
                        'TRANSACTION'
                    );
                    req.transactionError = {
                        status: StatusCodes.MISDIRECTED_REQUEST,
                        message: 'Remaining balance redirected to personal account.',
                        errors: ['Remaining balance redirected to personal account.']
                    };
                    req.body.transactiondesc += 'Remaining balance redirected to personal account.|';
                    return next();
                }

            // ---------------------------------------------------------------------
            // MINIMUM Type Distribution
            // ---------------------------------------------------------------------
            } else if (savingsProduct.compulsorydeposittype === 'MINIMUM') {
                console.log("Handling MINIMUM compulsory deposit type.");

                // 1) Distribute deposits to valid past dates first
                for (const date of validPastDates) {
                    if (remainingBalance >= savingsProduct.compulsorydepositfrequencyamount) {
                        // Skip if there's already a transaction on that date
                        if (hasTransactionOnThatDate(new Date(date))) {
                            console.log(`A transaction is already posted on ${date}. Skipping this past date.`);
                            continue;
                        }
                        const transactionData = {
                            accountnumber,
                            credit: savingsProduct.compulsorydepositfrequencyamount,
                            reference: generateNewReference(client, accountnumber, req, res),
                            description,
                            ttype,
                            status: 'ACTIVE',
                            transactiondate: date,
                            whichaccount
                        };
                        await saveTransaction(client, res, transactionData, req);
                        await activityMiddleware(
                            req.user.id,
                            `Transaction saved for past date (MINIMUM) on ${date}`,
                            'TRANSACTION'
                        );
                        remainingBalance -= savingsProduct.compulsorydepositfrequencyamount;
                    } else {
                        console.log(`Insufficient balance for past date deposit on ${date}. Redirecting remaining balance.`);
                        transactionStatus = 'REDIRECTED';
                        reasonForRejection = 'Remaining balance redirected to personal account';
                        await handleCreditRedirectToPersonnalAccount(
                            client,
                            req,
                            res,
                            accountuser,
                            generateNewReference(client, accountnumber, req, res),
                            reasonForRejection,
                            whichaccount,
                            remainingBalance
                        );
                        await client.query('COMMIT');
                        await activityMiddleware(
                            req,
                            req.user.id,
                            `Transaction committed after insufficient balance for past date deposit on ${date} (MINIMUM)`,
                            'TRANSACTION'
                        );
                        req.transactionError = {
                            status: StatusCodes.MISDIRECTED_REQUEST,
                            message: 'Remaining balance redirected to personal account.',
                            errors: ['Remaining balance redirected to personal account.']
                        };
                        req.body.transactiondesc += 'Remaining balance redirected to personal account.|';
                        return next();
                    }
                }

                console.log("Remaining balance after past deposits (MINIMUM):", remainingBalance);

                // 2) Next, handle current/future dates if leftover remains
                if (remainingBalance > 0) {
                    console.log("Processing current or future dates for MINIMUM deposit.");
                    if (allowFuture && validFutureDates.length > 0) {
                        // If future is allowed, distribute for valid future dates
                        for (const date of validFutureDates) {
                            if (remainingBalance >= savingsProduct.compulsorydepositfrequencyamount) {
                                if (hasTransactionOnThatDate(new Date(date))) {
                                    console.log(`A transaction is already posted on ${date}. Skipping this future date.`);
                                    continue;
                                }
                                const transactionData = {
                                    accountnumber,
                                    credit: savingsProduct.compulsorydepositfrequencyamount,
                                    reference: generateNewReference(client, accountnumber, req, res),
                                    description,
                                    ttype,
                                    status: 'ACTIVE',
                                    transactiondate: date,
                                    whichaccount
                                };
                                await saveTransaction(client, res, transactionData, req);
                                await activityMiddleware(
                                    req.user.id,
                                    `Transaction saved for future date (MINIMUM) on ${date}`,
                                    'TRANSACTION'
                                );
                                remainingBalance -= savingsProduct.compulsorydepositfrequencyamount;
                            } else {
                                break; // Not enough for another chunk
                            }
                        }
                        // If leftover remains and is not enough for another frequency chunk, redirect
                        if (remainingBalance > 0 && remainingBalance < savingsProduct.compulsorydepositfrequencyamount) {
                            console.log("Remaining balance less than frequency amount. Redirecting to personal account (MINIMUM).");
                            transactionStatus = 'REDIRECTED';
                            reasonForRejection = 'Remaining balance cannot form another chunk';
                            await handleCreditRedirectToPersonnalAccount(
                                client,
                                req,
                                res,
                                accountuser,
                                generateNewReference(client, accountnumber, req, res),
                                reasonForRejection,
                                whichaccount,
                                remainingBalance
                            );
                            await client.query('COMMIT');
                            await activityMiddleware(
                                req,
                                req.user.id,
                                'Transaction committed after leftover < frequency chunk (MINIMUM)',
                                'TRANSACTION'
                            );
                            req.transactionError = {
                                status: StatusCodes.MISDIRECTED_REQUEST,
                                message: 'Remaining balance redirected to personal account.',
                                errors: ['Remaining balance less than frequency amount.']
                            };
                            req.body.transactiondesc += 'Remaining balance less than frequency amount.|';
                            return next();
                        }
                    } else if (!allowFuture && isWithinPeriod) {
                        // If not allowing future dates but we are still in the current period, post once if possible
                        if (remainingBalance >= savingsProduct.compulsorydepositfrequencyamount) {
                            if (!hasTransactionOnThatDate(today)) {
                                const transactionData = {
                                    accountnumber,
                                    credit: savingsProduct.compulsorydepositfrequencyamount,
                                    reference: generateNewReference(client, accountnumber, req, res),
                                    description,
                                    ttype,
                                    status: 'ACTIVE',
                                    transactiondate: today,
                                    whichaccount
                                };
                                await saveTransaction(client, res, transactionData, req);
                                await activityMiddleware(
                                    req.user.id,
                                    'Transaction saved for today (MINIMUM)',
                                    'TRANSACTION'
                                );
                                remainingBalance -= savingsProduct.compulsorydepositfrequencyamount;
                            } else {
                                console.log("A transaction already exists for today. Skipping today's post, leftover may be redirected.");
                            }
                        }
                        // Redirect leftover if it's below one chunk or no more valid days
                        if (remainingBalance > 0) {
                            console.log("Redirecting leftover to personal account (MINIMUM) - no future allowed or leftover not enough.");
                            transactionStatus = 'REDIRECTED';
                            reasonForRejection = 'Remaining balance cannot be posted - no valid days or leftover < chunk';
                            await handleCreditRedirectToPersonnalAccount(
                                client,
                                req,
                                res,
                                accountuser,
                                generateNewReference(client, accountnumber, req, res),
                                reasonForRejection,
                                whichaccount,
                                remainingBalance
                            );
                            await client.query('COMMIT');
                            await activityMiddleware(
                                req,
                                req.user.id,
                                'Transaction committed after leftover cannot be fully posted (MINIMUM)',
                                'TRANSACTION'
                            );
                            req.transactionError = {
                                status: StatusCodes.MISDIRECTED_REQUEST,
                                message: 'Leftover redirected to personal account.',
                                errors: ['Leftover not posted because no future allowed or not enough for another chunk.']
                            };
                            req.body.transactiondesc += 'Leftover redirected to personal account.|';
                            return next();
                        }
                    } else {
                        // No valid future or no more places to post => redirect leftover
                        console.log("No remainder can be posted - no valid future or current date => leftover redirected (MINIMUM).");
                        transactionStatus = 'REDIRECTED';
                        reasonForRejection = 'Remaining balance redirected to personal account (MINIMUM - no valid date)';
                        await handleCreditRedirectToPersonnalAccount(
                            client,
                            req,
                            res,
                            accountuser,
                            generateNewReference(client, accountnumber, req, res),
                            reasonForRejection,
                            whichaccount,
                            remainingBalance
                        );
                        await client.query('COMMIT');
                        await activityMiddleware(
                            req,
                            req.user.id,
                            'Transaction committed after no valid date for leftover (MINIMUM)',
                            'TRANSACTION'
                        );
                        req.transactionError = {
                            status: StatusCodes.MISDIRECTED_REQUEST,
                            message: 'Remaining balance redirected to personal account.',
                            errors: ['No valid date for leftover.']
                        };
                        req.body.transactiondesc += 'Remaining balance redirected to personal account.|';
                        return next();
                    }
                }

            } else {
                // Handle other deposit types if necessary
                console.log("Unhandled compulsory deposit type:", savingsProduct.compulsorydeposittype);
                // You might want to handle other types or throw an error
            }

            // 15. Commit the transaction if all deposits have been handled successfully
            await client.query('COMMIT');
            await activityMiddleware(req.user.id, 'All compulsory deposits handled successfully', 'TRANSACTION');

            // Optionally, set a success response or proceed further    
            return next();
        }
 
        transactionStatus = 'ACTIVE';

        console.log('its saving without a problem')
        await saveTransaction(client, res, {
            accountnumber,
            credit,
            reference: await generateNewReference(client, accountnumber, req, res),
            description,
            ttype,
            status: transactionStatus,
            whichaccount
        }, req);
        
        // return next();
        
        


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
        // return next();

        //  // 8. Handle Deposit Charge
        //  if (credit > 0 && savingsProduct.depositcharge) {
        //     const chargeAmount = calculateCharge(savingsProduct, credit);
        //     await client.query(
        //         `INSERT INTO divine."transaction" (accountnumber, debit, description, reference, status, whichaccount) VALUES ($1, $2, $3, $4, 'PENDING', $5)`,
        //         [accountnumber, chargeAmount, 'Deposit Charge', generateNewReference(client, accountnumber, req, res), whichaccount]
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
};

// 11. Export the savingsCredit function
module.exports = {
    savingsCredit
};
