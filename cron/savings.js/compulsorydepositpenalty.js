const schedule = require('node-schedule');
const pg = require('../../db/pg'); // Assuming pg is set up in this path
const { generateNextDates, generateDates } = require('../../utils/datecode');
const { performTransactionOneWay } = require('../../middleware/transactions/performTransaction');
const activityMiddleware = require('../../middleware/activity');

schedule.scheduleJob('0 0 * * *', async () => {
    try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayDateStr = today.toISOString().split('T')[0];
        const yesterdayDateStr = yesterday.toISOString().split('T')[0];

        // Fetch all active savings products with compulsory deposit enabled and no deficit
        const productsResult = await pg.query(`
            SELECT * FROM savingsproduct
            WHERE status = $1 AND compulsorydeposit = $2 AND compulsorydepositdeficit = $3
        `, ['ACTIVE', true, false]);
        const products = productsResult.rows;

        for (const product of products) {
            // Fetch all frequency overrides for the current product
            const frequencyOverridesResult = await pg.query(`
                SELECT * FROM frequencyoverride
                WHERE savingsproductid = $1 AND status = $2
            `, [product.id, 'ACTIVE']);
            const frequencyOverrides = frequencyOverridesResult.rows;

            for (const freqOverride of frequencyOverrides) {
                const { compulsorydepositfrequency, branch } = freqOverride;

                // Generate the next dates based on the frequency
                const nextDates = generateNextDates(compulsorydepositfrequency, 1, yesterdayDateStr);

                // Check if today's date is in the generated next dates
                if (nextDates.includes(todayDateStr)) {
                    // Fetch all active accounts for the product and branch
                    const accountsResult = await pg.query(`
                        SELECT accountnumber, userid FROM savings
                        WHERE savingsproductid = $1 AND branch = $2 AND status = $3
                    `, [product.id, branch, 'ACTIVE']);
                    const accounts = accountsResult.rows;

                    // Generate date boundaries for transaction checks
                    const { secondToLastDate, lastDate } = generateDates(compulsorydepositfrequency);

                    for (const account of accounts) {
                        const { accountnumber, userid } = account;

                        // Check for any payment transactions between secondToLastDate and lastDate
                        const paymentExistsResult = await pg.query(`
                            SELECT 1 FROM transaction
                            WHERE accountnumber = $1 AND transactiondate BETWEEN $2 AND $3 
                        `, [accountnumber, new Date(secondToLastDate), new Date(lastDate)]);
                        const paymentExists = paymentExistsResult.rowCount > 0;

                        if (paymentExists) {
                            // If a payment exists, skip penalty deduction
                            continue;
                        }

                        let penaltyAmount = 0;

                        if (product.compulsorydepositpenaltytype == 'AMOUNT') {
                            penaltyAmount = product.compulsorydepositpenalty;
                        } else if (product.compulsorydepositpenaltytype == 'PERCENTAGE') {
                            // Calculate the current balance
                            const balanceDataResult = await pg.query(`
                                SELECT SUM(credit) AS totalCredit, SUM(debit) AS totalDebit FROM transaction
                                WHERE accountnumber = $1 AND status = $2
                            `, [accountnumber, 'ACTIVE']);
                            const balanceData = balanceDataResult.rows[0];

                            const totalCredit = balanceData.totalcredit || 0;
                            const totalDebit = balanceData.totaldebit || 0;
                            const balance = totalCredit - totalDebit;

                            penaltyAmount = (product.compulsorydepositpenalty / 100) * balance;
                        } else {
                            // Invalid penalty type, skip to next account
                            continue;
                        }

                        if (penaltyAmount <= 0) {
                            // No penalty to apply
                            continue;
                        }

                        // Fetch user details to verify branch
                        const userResult = await pg.query(`
                            SELECT branch FROM "user"
                            WHERE id = $1
                        `, [userid]);
                        const user = userResult.rows[0];

                        if (!user || user.branch !== branch) {
                            // User not found or branch mismatch, skip penalty deduction
                            continue;
                        }

                        // Prepare transaction data for penalty deduction
                        const transactionData = {
                            accountnumber: accountnumber,
                            userid: userid,
                            currency: product.currency,
                            credit: 0,
                            debit: penaltyAmount,
                            description: 'Compulsory Deposit Penalty',
                            branch: branch,
                            registrationpoint: null,
                            dateadded: new Date(),
                            status: 'ACTIVE',
                            transactiondate: new Date(),
                            transactiondesc: 'Compulsory Deposit Penalty Charged',
                            transactionref: `CDP-${Date.now()}`,
                            ttype: 'CHARGES',
                            tfrom: 'BANK',
                            createdby: 0, // Assuming system user
                            valuedate: new Date(),
                            whichaccount: 'SAVINGS',
                            tax: false,
                        };

                        // Perform the penalty deduction transaction
                        const transactionResult = await performTransactionOneWay(transactionData, userid);

                        if (transactionResult.status) {
                            // Log successful penalty deduction
                            await activityMiddleware({
                                user: { id: userid },
                                body: transactionData,
                            }, userid, 'Compulsory deposit penalty charged successfully', 'TRANSACTION');
                        } else {
                            // Log failed penalty deduction
                            await activityMiddleware({
                                user: { id: userid },
                                body: transactionData,
                            }, userid, 'Failed to charge compulsory deposit penalty', 'TRANSACTION_ERROR');
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in Compulsory Deposit Penalty Cron Job:', error);
        // Optionally, log this error using activityMiddleware or another logging mechanism
    }
});
 