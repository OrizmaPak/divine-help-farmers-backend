 // Start of Selection
const schedule = require('node-schedule');
const pg = require('../../db/pg');
const { validateCode, generateNextDates } = require('../../utils/datecode');
const { performTransaction } = require('../../utils/transaction');
const orgSettings = require('../../config/orgSettings');
const activityMiddleware = require('../../middleware/activity');

schedule.scheduleJob('0 0 * * *', async () => {
    try {
        const today = new Date();
        const todayDateStr = today.toISOString().split('T')[0];

        // Fetch all active savings products that have at least one active interest or deduction
        const productsResult = await pg.query(`
            SELECT *
            FROM divine."savingsproduct"
            WHERE status = 'ACTIVE' AND (
                EXISTS (
                    SELECT 1 FROM divine."Interest"
                    WHERE "savingsproductid" = divine."savingsproduct".id AND status = 'ACTIVE'
                ) OR
                EXISTS (
                    SELECT 1 FROM divine."Deduction"
                    WHERE "savingsproductid" = divine."savingsproduct".id AND status = 'ACTIVE'
                )
            )
        `);
        const products = productsResult.rows;

        for (const product of products) {
            // Fetch active interests for the product
            const interestsResult = await pg.query(`
                SELECT *
                FROM divine."Interest"
                WHERE "savingsproductid" = $1 AND status = 'ACTIVE'
            `, [product.id]);
            const interests = interestsResult.rows;

            // Fetch active deductions for the product
            const deductionsResult = await pg.query(`
                SELECT *
                FROM divine."Deduction"
                WHERE "savingsproductid" = $1 AND status = 'ACTIVE'
            `, [product.id]);
            const deductions = deductionsResult.rows;

            // Process Interests
            for (const interest of interests) {
                if (!validateCode(interest.interestfrequency)) continue;

                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                const yesterdayDateStr = yesterday.toISOString().split('T')[0];

                const nextDates = generateNextDates(interest.interestfrequency, 1, yesterdayDateStr);
                if (!nextDates.includes(todayDateStr)) continue;

                // Fetch all active accounts for the product
                const accountsResult = await pg.query(`
                    SELECT accountnumber, dateadded
                    FROM divine."account"
                    WHERE "productid" = $1 AND status = 'ACTIVE'
                `, [product.id]);
                const accounts = accountsResult.rows;

                for (const account of accounts) {
                    // Calculate account age in months
                    const dateAdded = new Date(account.dateadded);
                    const ageInMonths = (today.getFullYear() - dateAdded.getFullYear()) * 12 + (today.getMonth() - dateAdded.getMonth());
                    if (interest.interesteligibilityaccountage > 0 && ageInMonths < interest.interesteligibilityaccountage) continue;

                    // Calculate account balance
                    const transactionsResult = await pg.query(`
                        SELECT credit, debit
                        FROM divine."transaction"
                        WHERE "accountnumber" = $1 AND status = 'ACTIVE'
                    `, [account.accountnumber]);
                    const transactions = transactionsResult.rows;

                    const balance = transactions.reduce((acc, txn) => acc + (txn.credit || 0) - (txn.debit || 0), 0);
                    if (interest.interesteligibilitybalance > 0 && balance < interest.interesteligibilitybalance) continue;

                    // Calculate interest amount
                    let interestAmount = 0;
                    if (interest.interesttype === 'AMOUNT') {
                        interestAmount = interest.interestamount;
                    } else if (interest.interesttype === 'PERCENTAGE') {
                        interestAmount = (balance * interest.interestamount) / 100;
                    }

                    if (interest.interestgoforapproval) {
                        // Create a pending interest transaction
                        await pg.query(`
                            INSERT INTO divine."transaction" (
                                accountnumber, userid, currency, credit, debit, description, "transactiondate",
                                status, ttype, tfrom, createdby, whichaccount
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                            )
                        `, [
                            account.accountnumber,
                            0,
                            'NGN',
                            interest.interesttype === 'PERCENTAGE' ? (balance * interest.interestamount) / 100 : interest.interestamount,
                            0,
                            `Pending interest for product ID ${product.id}`,
                            today,
                            'PENDING INTEREST',
                            'INTEREST',
                            'BANK',
                            0,
                            'SAVINGS'
                        ]);

                        // Log the activity
                        await activityMiddleware(null, 0, 'Pending interest transaction created', 'INTEREST');
                    } else {
                        // Perform the transaction immediately
                        const fromTransaction = {
                            accountnumber: orgSettings.default_asset_account,
                            credit: 0,
                            debit: interestAmount,
                            description: `Interest deduction for product ID ${product.id}`,
                            transactiondate: today,
                            ttype: 'INTEREST',
                            tfrom: 'BANK',
                            currency: 'NGN',
                            whichaccount: 'SAVINGS',
                            status: 'ACTIVE',
                            userid: 0,
                            createdby: 0
                        };

                        const toTransaction = {
                            accountnumber: account.accountnumber,
                            credit: interestAmount,
                            debit: 0,
                            description: `Interest credited for product ID ${product.id}`,
                            transactiondate: today,
                            ttype: 'INTEREST',
                            tfrom: 'BANK',
                            currency: 'NGN',
                            whichaccount: 'SAVINGS',
                            status: 'ACTIVE',
                            userid: 0,
                            createdby: 0
                        };

                        await performTransaction(fromTransaction, toTransaction, 0, 0);

                        // Log the activity
                        await activityMiddleware(null, 0, 'Interest credited successfully', 'INTEREST');
                    }
                }
            }

            // Process Deductions
            for (const deduction of deductions) {
                if (!validateCode(deduction.deductionfrequency)) continue;

                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                const yesterdayDateStr = yesterday.toISOString().split('T')[0];

                const nextDates = generateNextDates(deduction.deductionfrequency, 1, yesterdayDateStr);
                if (!nextDates.includes(todayDateStr)) continue;

                // Fetch all active accounts for the product
                const accountsResult = await pg.query(`
                    SELECT accountnumber, dateadded
                    FROM divine."account"
                    WHERE "productid" = $1 AND status = 'ACTIVE'
                `, [product.id]);
                const accounts = accountsResult.rows;

                for (const account of accounts) {
                    // Calculate account age in months
                    const dateAdded = new Date(account.dateadded);
                    const ageInMonths = (today.getFullYear() - dateAdded.getFullYear()) * 12 + (today.getMonth() - dateAdded.getMonth());
                    if (deduction.deductioneligibilityaccountage > 0 && ageInMonths < deduction.deductioneligibilityaccountage) continue;

                    // Calculate account balance
                    const transactionsResult = await pg.query(`
                        SELECT credit, debit
                        FROM divine."transaction"
                        WHERE "accountnumber" = $1 AND status = 'ACTIVE'
                    `, [account.accountnumber]);
                    const transactions = transactionsResult.rows;

                    const balance = transactions.reduce((acc, txn) => acc + (txn.credit || 0) - (txn.debit || 0), 0);
                    if (deduction.deductioneligibilitybalance > 0 && balance < deduction.deductioneligibilitybalance) continue;

                    // Calculate deduction amount
                    let deductionAmount = 0;
                    if (deduction.deductiontype === 'AMOUNT') {
                        deductionAmount = deduction.deductionamount;
                    } else if (deduction.deductiontype === 'PERCENTAGE') {
                        deductionAmount = (balance * deduction.deductionamount) / 100;
                    }

                    if (deduction.deductiongoforapproval) {
                        // Create a pending deduction transaction
                        await pg.query(`
                            INSERT INTO divine."transaction" (
                                accountnumber, userid, currency, credit, debit, description, "transactiondate",
                                status, ttype, tfrom, createdby, whichaccount
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                            )
                        `, [
                            account.accountnumber,
                            0,
                            'NGN',
                            0,
                            deduction.deductiontype === 'PERCENTAGE' ? (balance * deduction.deductionamount) / 100 : deduction.deductionamount,
                            `Pending deduction for product ID ${product.id}`,
                            today,
                            'PENDING DEDUCTION',
                            'DEDUCTION',
                            'BANK',
                            0,
                            'SAVINGS'
                        ]);

                        // Log the activity
                        await activityMiddleware(null, 0, 'Pending deduction transaction created', 'DEDUCTION');
                    } else {
                        // Perform the transaction immediately
                        const fromTransaction = {
                            accountnumber: account.accountnumber,
                            credit: 0,
                            debit: deductionAmount,
                            description: `Deduction for product ID ${product.id}`,
                            transactiondate: today,
                            ttype: 'DEDUCTION',
                            tfrom: 'BANK',
                            currency: 'NGN',
                            whichaccount: 'SAVINGS',
                            status: 'ACTIVE',
                            userid: 0,
                            createdby: 0
                        };

                        const toTransaction = {
                            accountnumber: orgSettings.default_asset_account,
                            credit: deductionAmount,
                            debit: 0,
                            description: `Deduction collected for product ID ${product.id}`,
                            transactiondate: today,
                            ttype: 'DEDUCTION',
                            tfrom: 'BANK',
                            currency: 'NGN',
                            whichaccount: 'SAVINGS',
                            status: 'ACTIVE',
                            userid: 0,
                            createdby: 0
                        };

                        await performTransaction(fromTransaction, toTransaction, 0, 0);

                        // Log the activity
                        await activityMiddleware(null, 0, 'Deduction processed successfully', 'DEDUCTION');
                    }
                }
            }
        }

        console.log('Scheduled interest and deduction processing completed successfully.');
    } catch (error) {
        console.error('Error during scheduled interest and deduction processing:', error);
        // Log the error in activity
        await activityMiddleware(null, 0, `Error during scheduled processing: ${error.message}`, 'CRON_JOB');
    }
});