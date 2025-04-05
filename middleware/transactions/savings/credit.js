/**
 * Please note: The following rewrite incorporates the requested period checks:
 *  1. If there is no transaction at all, post to the current period; if remainder is enough and allowFuture is true, also post to future; otherwise redirect leftover.
 *  2. If last transaction is in a past period:
 *     - if allowBackDated == false, then start posting from the current period only, then if remainder remains and allowFuture is true, post to future; else redirect.
 *     - if allowBackDated == true, it proceeds with normal distribution as needed (past, current, future) aligning with compulsorydeposittype logic.
 *  3. If the last transaction is in the current period:
 *     - if allowFuture is true, post future chunks as needed; otherwise redirect leftover.
 *  4. If the last transaction is in a future period:
 *     - if allowFuture is true, post future chunks as needed; otherwise redirect leftover.
 *
 * The rest of the logic for "FIXED" or "MINIMUM" distribution, chunking, and redirection is preserved where applicable.
 */

// Start of Selection
const { StatusCodes } = require('http-status-codes');
const {
    saveFailedTransaction,
    savePendingTransaction,
    handleCreditRedirectToPersonalAccount,
    calculateCharge, 
    generateNewReference,
    handleCreditRedirectToPersonnalAccount,
    saveTransaction,
    applyMinimumCreditAmountPenalty,
    applySavingsCharge
} = require('../../../utils/transactionHelper');
const { activityMiddleware } = require('../../activity');
const { getTransactionPeriod, generateNextDates } = require('../../../utils/datecode');

async function savingsCredit(client, req, res, next, accountnumber, credit, description, ttype, transactionStatus, savingsProduct, whichaccount, accountuser) {
    console.log("Entered savingsCredit function with credit:", credit);
    if (credit > 0) {

        // Apply check for minimum credit and penalty
        await applyMinimumCreditAmountPenalty(client, req, res, req.orgSettings);

        // 8. Handle Deposit Charge
        if (credit > 0 && savingsProduct.depositcharge) {
            console.log("Handling deposit charge for credit:", credit);
            await applySavingsCharge(client, req, res, accountnumber, credit, whichaccount);
        }
        console.log('it left the charge area');

        // 7. Savings Product Rules - Allow Deposit
        if (credit > 0 && !savingsProduct.allowdeposit) {
            console.log("Deposits not allowed on this product, redirecting transaction.");
            transactionStatus = 'REDIRECTED';
            const reasonForRejection = 'Deposits not allowed on this product';
            // Handle redirection to excess account logic
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
            await activityMiddleware(req, req.user.id, 'Transaction committed after deposit not allowed', 'TRANSACTION');
            req.transactionError = {
                status: StatusCodes.MISDIRECTED_REQUEST,
                message: 'Transaction has been redirected to the personal account because the savings account is restricted from taking deposits.',
                errors: ['Deposits not allowed on this product. Transaction redirected to personal account.']
            };
            req.body.transactiondesc += 'Deposits not allowed on this product.|';
            return next();
        }

        // **9. Check Max Balance Limit**
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
            let scd = savingsProduct.compulsorydepositdeficit;
            let rod = req.orgSettings.allow_back_dated_transaction;
            let scf = savingsProduct.compulsorydepositspillover;
            let rof = req.orgSettings.allow_future_transaction;

            const allowBackDated = (scd && rod === 'YES');
            const allowFuture = (scf && rof === 'YES');

            console.log("Allowing back dated transactions:", allowBackDated, rod);
            console.log("Allowing future transactions:", allowFuture, rof);

            // 2. Check if credit is less than the compulsory deposit amount
            if (credit < savingsProduct.compulsorydepositfrequencyamount) {
                console.log("Credit amount is less than compulsory deposit amount.");
                transactionStatus = 'FAILED';
                const reasonForRejection = 'Credit amount is less than compulsory deposit amount';
                await handleCreditRedirectToPersonnalAccount(
                    client,
                    req,
                    res,
                    accountuser,
                    generateNewReference(client, accountnumber, req, res),
                    reasonForRejection,
                    whichaccount
                );
                await client.query('COMMIT');
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

            // -- Create references for "today's period"
            const today = new Date();
            const { startDate: currentPeriodStart, endDate: currentPeriodEnd } =
                getTransactionPeriod(savingsProduct.compulsorydepositfrequency, today);
            console.log("Today's period from", currentPeriodStart, "to", currentPeriodEnd);

            // Utility to check if a transaction already exists on a given date
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
                    (row) => new Date(row.transactiondate).toDateString() == compareDay
                );
            };

            // Helper to post deposit for a single date
            async function postSingleDeposit(dateObj, amount, logMsg) {
                const transactionData = {
                    accountnumber,
                    credit: amount,
                    reference: generateNewReference(client, accountnumber, req, res),
                    description,
                    ttype,
                    status: 'ACTIVE',
                    transactiondate: dateObj,
                    whichaccount
                };
                await saveTransaction(client, res, transactionData, req);
                await activityMiddleware(
                    req,
                    req.user.id,
                    logMsg,
                    'TRANSACTION'
                );
            }

            // Utility: redirect leftover to personal (used in FIXED type logic)
            async function redirectLeftover(remainingBalanceVal, reason) {
                console.log("Redirecting leftover to personal account:", remainingBalanceVal);
                transactionStatus = 'REDIRECTED';
                await handleCreditRedirectToPersonnalAccount(
                    client,
                    req,
                    res,
                    accountuser,
                    generateNewReference(client, accountnumber, req, res),
                    reason,
                    whichaccount,
                    remainingBalanceVal
                );
                await client.query('COMMIT');
                await activityMiddleware(
                    req,
                    req.user.id,
                    `Transaction committed after leftover redirect: ${reason}`,
                    'TRANSACTION'
                );
                req.transactionError = {
                    status: StatusCodes.MISDIRECTED_REQUEST,
                    message: 'Remaining balance redirected to personal account.',
                    errors: [reason]
                };
                req.body.transactiondesc += `${reason}|`;
                return next();
            }

            // If the compulsory deposit type is MINIMUM, then fund the entire credit in one transaction.
            if (savingsProduct.compulsorydeposittype == 'MINIMUM') {
                console.log("Compulsory deposit type is MINIMUM. Depositing the entire credit in one transaction.");
                let depositDate = today;
                if (hasTransactionOnThatDate(today)) {
                    // Today's date already has a transaction.
                    if (!allowFuture) {
                        console.log("Future transactions are not allowed and today's date already has a transaction.");
                        return redirectLeftover(credit, 'Today already has a transaction and future transactions are not allowed for MINIMUM deposit.');
                    } else {
                        // Get the next valid date using generateNextDates
                        const allDates = generateNextDates(savingsProduct.compulsorydepositfrequency, 1, currentPeriodEnd);
                        let candidateDate = new Date(allDates[0]);
                        // If backdating is disallowed, ensure the candidate is not before today.
                        if (!allowBackDated && candidateDate < today) {
                            candidateDate = today;
                        }
                        depositDate = candidateDate;
                    }
                }
                await postSingleDeposit(
                    depositDate,
                    credit,
                    `Transaction saved for MINIMUM type on ${depositDate} with entire credit`
                );
                await client.query('COMMIT');
                await activityMiddleware(
                    req,
                    req.user.id,
                    'MINIMUM compulsory deposit handled successfully with entire credit',
                    'TRANSACTION'
                );
                return next();
            }

            // For compulsory type FIXED, proceed with the original distribution logic

            // Retrieve the last active transaction
            const lastTransactionQuery = `
                SELECT *
                FROM divine."transaction"
                WHERE accountnumber = $1 AND status = 'ACTIVE'
                ORDER BY transactiondate DESC
                LIMIT 1
            `;
            const lastTransactionResult = await client.query(lastTransactionQuery, [accountnumber]);

            // Classify the "last transaction date" relative to today's period
            let classification = 'NONE'; // No transaction at all
            let lastTxDate = null;
            if (lastTransactionResult.rowCount > 0) {
                lastTxDate = new Date(lastTransactionResult.rows[0].transactiondate);
                if (lastTxDate < new Date(currentPeriodStart)) {
                    classification = 'PAST';
                } else if (lastTxDate > new Date(currentPeriodEnd)) {
                    classification = 'FUTURE';
                } else {
                    classification = 'CURRENT';
                }
            }
            console.log("Classification of last transaction relative to current period:", classification);

            /**
             * Utility function to distribute deposit for the "FIXED" type,
             * using a list of candidate dates (which may be past or future) subject to
             * allowBackDated or allowFuture checks.
             */
            async function distributeCompulsoryDeposit(amount) {
                let remainingBalanceVal = amount;

                // Generate the chunkable frequency dates from today or around today
                const multipleOfFrequency = Math.floor(
                    remainingBalanceVal / savingsProduct.compulsorydepositfrequencyamount
                );
                const allDates = generateNextDates(
                    savingsProduct.compulsorydepositfrequency,
                    multipleOfFrequency,
                    currentPeriodEnd
                );

                // Partition past & future
                const validPastDates = allDates.filter(d => new Date(d) <= today);
                const validFutureDates = allDates.filter(d => new Date(d) > today);

                // If not allowing backdated, remove past dates older than today
                const finalPastDates = allowBackDated ? validPastDates : validPastDates.filter(d => new Date(d).toDateString() == today.toDateString());
                // If not allowing future, remove future dates
                const finalFutureDates = allowFuture ? validFutureDates : [];

                console.log("Distributing deposit, type: FIXED");
                console.log("finalPastDates:", finalPastDates);
                console.log("finalFutureDates:", finalFutureDates);

                // Post one chunk per valid date in chronological order
                for (const date of [...finalPastDates, ...finalFutureDates]) {
                    if (remainingBalanceVal >= savingsProduct.compulsorydepositfrequencyamount) {
                        if (!hasTransactionOnThatDate(date)) {
                            await postSingleDeposit(
                                date,
                                savingsProduct.compulsorydepositfrequencyamount,
                                `Transaction saved for FIXED type on ${date}`
                            );
                            remainingBalanceVal -= savingsProduct.compulsorydepositfrequencyamount;
                        }
                    } else {
                        break;
                    }
                }

                // If leftover remains, redirect it
                if (remainingBalanceVal > 0) {
                    return redirectLeftover(
                        remainingBalanceVal,
                        'Remaining balance after chunk distribution.'
                    );
                }

                // Commit if the entire amount has been distributed
                await client.query('COMMIT');
                await activityMiddleware(
                    req,
                    req.user.id,
                    'All compulsory deposits handled successfully',
                    'TRANSACTION'
                );
                return next();
            }

            // We'll define how to handle each classification for FIXED type:
            let remainingBalance = credit;

            // Case A: No last transaction
            if (classification == 'NONE') {
                console.log("No last transaction found. Posting to current period first.");
                if (remainingBalance >= savingsProduct.compulsorydepositfrequencyamount) {
                    if (!hasTransactionOnThatDate(today)) {
                        await postSingleDeposit(
                            today,
                            savingsProduct.compulsorydepositfrequencyamount,
                            `Transaction posted for current period (no prior tx).`
                        );
                        remainingBalance -= savingsProduct.compulsorydepositfrequencyamount;
                    }
                } else {
                    return redirectLeftover(
                        remainingBalance,
                        'Not enough credit for a single chunk in the current period.'
                    );
                }
                return distributeCompulsoryDeposit(remainingBalance);
            }

            // Case B: Last transaction is in a past period relative to current
            if (classification == 'PAST') {
                console.log("Last transaction is in a past period.");
                if (!allowBackDated) {
                    console.log("Backdating not allowed, so we start from current period only.");
                    if (remainingBalance >= savingsProduct.compulsorydepositfrequencyamount) {
                        if (!hasTransactionOnThatDate(today)) {
                            await postSingleDeposit(
                                today,
                                savingsProduct.compulsorydepositfrequencyamount,
                                'Transaction posted in current period (past last tx, no backdate).'
                            );
                            remainingBalance -= savingsProduct.compulsorydepositfrequencyamount;
                        }
                    } else {
                        return redirectLeftover(
                            remainingBalance,
                            'Not enough credit to post a chunk in current period.'
                        );
                    }
                    return distributeCompulsoryDeposit(remainingBalance);
                } else {
                    console.log("Backdating is allowed. Proceeding with normal distribution across past/current/future as relevant.");
                    return distributeCompulsoryDeposit(remainingBalance);
                }
            }

            // Case C: Last transaction is in the current period
            if (classification == 'CURRENT') {
                console.log("Last transaction is in the current period.");
                return distributeCompulsoryDeposit(remainingBalance);
            }

            // Case D: Last transaction is in a future period
            if (classification == 'FUTURE') {
                console.log("Last transaction is in a future period.");
                if (!allowFuture) {
                    return redirectLeftover(
                        remainingBalance,
                        'Cannot post further because last transaction is already in the future and future posting is disallowed.'
                    );
                }
                return distributeCompulsoryDeposit(remainingBalance);
            }

            // Fallback
            console.log("Unexpected classification. Committing transaction as fallback.");
            await client.query('COMMIT');
            return next();
        }

        // If not a compulsory deposit or we made it here, save normally
        transactionStatus = 'ACTIVE';
        console.log('its saving without a problem');
        await saveTransaction(client, res, {
            accountnumber,
            credit,
            reference: await generateNewReference(client, accountnumber, req, res),
            description,
            ttype,
            status: transactionStatus,
            whichaccount
        }, req);

        return next();
    }
};

module.exports = {
    savingsCredit
};
