const pg = require('../../db/pg'); // Use your existing pg setup
const { StatusCodes } = require('http-status-codes'); // Assuming you are using http-status-codes for status codes
const { activityMiddleware } = require('../activity'); // Import activity middleware
const { 
    saveFailedTransaction, 
    savePendingTransaction, 
    saveTransaction, 
    calculateCharge, 
    calculatePenalty, 
    calculateTax, 
    generateNewReference, 
    sendNotification, 
    handleCreditRedirectToPersonnalAccount, 
    applyMinimumCreditAmountPenalty
} = require('../../utils/transactionHelper'); // Import all helper functions
const { getTransactionPeriod, generateNextDates } = require('../../utils/datecode');
const { savingsCredit } = require('./savings/credit');
const { savingsDebit } = require('./savings/debit');
const { personalCredit } = require('./personal/credit');
const { personalDebit } = require('./personal/debit');
const { loanCredit } = require('./loan/credit');

// Middleware function to save a transaction
const saveTransactionMiddleware = async (req, res, next) => {
    let user = req.user; // Get the user from the request
    const client = pg; // Use the pg client for database operations
    try {
        await client.query('BEGIN'); // Start a transaction
        await activityMiddleware(req, req.user.id, 'Transaction started', 'TRANSACTION'); // Log the start of a transaction

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
            branch = '',
            registrationpoint = '',
            ttype,
            tfrom,
            tax = false,
        } = req.body;

        let whichaccount; // Variable to determine the type of account
        let accountuser; // Variable to store account user details
        let personnalaccount; // Variable to store personal account number

        // Log activity for attempting to save transaction
        await activityMiddleware(req, req.user.id, 'Attempting to save transaction', 'TRANSACTION');
        
        // Query to get organisation settings
        const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings" LIMIT 1`;
        const orgSettingsResult = await client.query(orgSettingsQuery);
        if (orgSettingsResult.rowCount === 0) {
            // If organisation settings are not found, rollback the transaction
            await activityMiddleware(req, req.user.id, 'Organisation settings not found', 'TRANSACTION');
            await client.query('ROLLBACK'); // Rollback the transaction
            await activityMiddleware(req, req.user.id, 'Transaction rolled back due to missing organisation settings', 'TRANSACTION');
            req.transactionError = {
                status: StatusCodes.INTERNAL_SERVER_ERROR,
                message: 'Organisation settings not found.',
                errors: ['Internal server error.'] 
            };
            req.body.transactiondesc += 'Organisation settings not found.|';
            return next();
        }
        const orgSettings = orgSettingsResult.rows[0]; // Store organisation settings
        req['orgSettings'] = orgSettings; // Attach organisation settings to request

        // Check if both credit and debit are greater than zero
        if (credit > 0 && debit > 0) {
            // If both are greater than zero, save the transaction as failed
            await saveFailedTransaction(client, req, res, 'Invalid transaction', await generateNewReference(client, accountnumber, req, res), whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            await activityMiddleware(req, req.user.id, 'Transaction committed after invalid credit and debit', 'TRANSACTION');
            req.transactionError = {
                status: StatusCodes.EXPECTATION_FAILED,
                message: 'Both credit and debit cannot be greater than zero.',
                errors: ['Invalid transaction.']
            };
            req.body.transactiondesc += 'Both credit and debit cannot be greater than zero.|';
            return next();
        }

        // Validate the account number and status
        const savingsAccountQuery = `SELECT * FROM divine."savings" WHERE accountnumber = $1`;
        const loanAccountQuery = `SELECT * FROM divine."loanaccounts" WHERE accountnumber = $1`;
        let parsedAccountNumber = accountnumber;
        if (isNaN(accountnumber)) {
            parsedAccountNumber = parseInt(accountnumber, 10);
            if (isNaN(parsedAccountNumber)) {
                parsedAccountNumber = '0000000000'; // Default account number if parsing fails
            }
        }
        const accountResult = await client.query(savingsAccountQuery, [parsedAccountNumber]);
        const loanAccountResult = await client.query(loanAccountQuery, [parsedAccountNumber]);
        if (accountResult.rowCount !== 0) {
            whichaccount = 'SAVINGS'; // Set account type to SAVINGS
        } else if (accountnumber.startsWith(orgSettings.personal_account_prefix)) {
            const phoneNumber = accountnumber.substring(orgSettings.personal_account_prefix.length);
            const userQuery = `SELECT * FROM divine."User" WHERE phone = $1`;
            const userResult = await client.query(userQuery, [phoneNumber]);
            if (userResult.rowCount === 0) {
                // If personal account number is invalid, save the transaction as failed
                await saveFailedTransaction(client, req, res, 'Invalid personal account number', await generateNewReference(client, accountnumber, req, res), whichaccount);
                await client.query('COMMIT'); // Commit the transaction
                await activityMiddleware(req, req.user.id, 'Transaction failed due to invalid personal account number', 'TRANSACTION');
                req.transactionError = {
                    status: StatusCodes.EXPECTATION_FAILED,
                    message: 'Invalid personal or savings account number.',
                    errors: ['Account not found.']
                }; 
                req.body.transactiondesc += 'Invalid personal or savings account number.|';
            }
            whichaccount = 'PERSONAL'; // Set account type to PERSONAL
            const accountuser = userResult.rows[0]; // Save the user data in accountuser variable
        } else if (loanAccountResult.rowCount !== 0) {
            whichaccount = 'LOAN'; // Set account type to LOAN
            const loanaccountuser = loanAccountResult.rows[0]; // Save the user data in loanaccountuser variable
            req.body.loanaccountnumber = loanaccountuser.accountnumber;
            req.body.loanaccount = loanaccountuser;
        }
        // Establish the personal account number
        req.body['personalaccountnumber'] = `${orgSettings.personal_account_prefix}${user.phone}`;
        req.body.phone = user.phone;
        personnalaccount = `${orgSettings.personal_account_prefix}${user.phone}`;

        if (accountResult.rowCount === 0 && !accountnumber.startsWith(orgSettings.personal_account_prefix) && loanAccountResult.rowCount === 0) {
            // If account number is invalid, save the transaction as failed
            await saveFailedTransaction(client, req, res, 'Invalid account number', await generateNewReference(client, accountnumber, req, res), whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            await activityMiddleware(req, req.user.id, 'Transaction committed after invalid personal account number', 'TRANSACTION');
            req.transactionError = {
                status: StatusCodes.EXPECTATION_FAILED,
                message: 'Invalid account number.',
                errors: ['Account not found.']
            };
            req.body.transactiondesc += 'Invalid account number.|';
            return next();
        }

        // Initialize transaction status and reason for rejection
        let transactionStatus = 'PENDING';
        let reasonForRejection = '';
        let reasonForPending = '';

        // Check for currency mismatch and date restrictions
        const currentDate = new Date();
        if (!orgSettings.allow_back_dated_transaction && new Date(transactiondate) < currentDate) {
            transactionStatus = 'FAILED';
            reasonForRejection = 'Back-dated transactions are not allowed';
            // Immediately save the transaction as failed and stop processing
            await saveFailedTransaction(client, req, res, reasonForRejection, await generateNewReference(client, accountnumber, req, res), whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            await activityMiddleware(req, req.user.id, 'Transaction committed after back-dated transaction', 'TRANSACTION');
            req.transactionError = {
                status: StatusCodes.FAILED_DEPENDENCY,
                message: 'Transaction failed due to back-dated transaction.',
                errors: ['Back-dated transactions are not allowed.']
            };
            req.body.transactiondesc += 'Transaction failed due to back-dated transaction.|';
            return next();
        }
        if (!orgSettings.allow_future_transaction && new Date(transactiondate) > currentDate) {
            transactionStatus = 'FAILED';
            reasonForRejection = 'Future transactions are not allowed';
            // Immediately save the transaction as failed and stop processing
            await saveFailedTransaction(client, req, res, reasonForRejection, await generateNewReference(client, accountnumber, req, res), whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            await activityMiddleware(req, req.user.id, 'Transaction committed after future transaction', 'TRANSACTION');
            req.transactionError = {
                status: StatusCodes.FAILED_DEPENDENCY,
                message: 'Transaction failed due to future transaction.',
                errors: ['Future transactions are not allowed.']
            };
            req.body.transactiondesc += 'Transaction failed due to future transaction.|';
            return next();
        }
        const rejectTransactionDateQuery = `SELECT * FROM divine."Rejecttransactiondate" WHERE rejectiondate = $1`;
        const rejectTransactionDateResult = await client.query(rejectTransactionDateQuery, [currentDate.toISOString().split('T')[0]]);
        if (rejectTransactionDateResult.rowCount > 0) {
            transactionStatus = 'FAILED';
            reasonForRejection = 'Transaction date is a rejected date';
            // Immediately save the transaction as failed and stop processing
            req.body.status = 'REJECTED';
            await saveFailedTransaction(client, req, res, reasonForRejection, await generateNewReference(client, accountnumber, req, res), whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            await activityMiddleware(req, req.user.id, 'Transaction committed after rejected date', 'TRANSACTION');
            req.transactionError = {
                status: StatusCodes.FAILED_DEPENDENCY,
                message: 'Transaction failed due to rejected date.',
                errors: ['Transaction date is a rejected date.']
            };
            req.body.transactiondesc += 'Transaction date is a rejected date.|';
            return next();
        }
        
        // Get the user of the account number if it's a savings account      
        if (whichaccount === 'SAVINGS') {            
            accountuser = accountResult.rows[0]; // Get account user details
            console.log('as e dey hot', accountuser);
            req.body['userid'] = accountuser.userid; // Attach user ID to request body

            const account = accountResult.rows[0]; // Get account details
            if (account.status !== 'ACTIVE') {
                // If account is not active, save the transaction as failed
                await saveFailedTransaction(client, req, res, 'Account is not active.', await generateNewReference(client, accountnumber, req, res), whichaccount);
                await client.query('COMMIT'); // Commit the transaction
                await activityMiddleware(req, req.user.id, 'Transaction committed after inactive account', 'TRANSACTION');
                req.transactionError = {
                    status: StatusCodes.EXPECTATION_FAILED,
                    message: 'Account is not active.',
                    errors: ['Inactive account.']
                };
                req.body.transactiondesc += 'Account is not active.|';
                return next();
            }

            // Validate the savings product
            const savingsProductQuery = `SELECT * FROM divine."savingsproduct" WHERE id = $1`;
            const savingsProductResult = await client.query(savingsProductQuery, [account.savingsproductid]);
            if (savingsProductResult.rowCount === 0) {
                // If savings product is invalid, save the transaction as failed
                await saveFailedTransaction(client, req, res, 'Invalid savings product', await generateNewReference(client, accountnumber, req, res), whichaccount);
                await client.query('COMMIT'); // Commit the transaction
                await activityMiddleware(req, req.user.id, 'Transaction committed after invalid savings product', 'TRANSACTION');
                req.transactionError = {
                    status: StatusCodes.EXPECTATION_FAILED,
                    message: 'Invalid savings product.',
                    errors: ['Savings product not found.']
                };
                req.body.transactiondesc += 'Invalid savings product.|';
                return next();
            }

            const savingsProduct = savingsProductResult.rows[0]; // Get savings product details
            // Check for frequency override
            const frequencyOverrideQuery = `
                SELECT * FROM divine."frequencyoverride" 
                WHERE savingsproductid = $1 AND branch = $2 AND status = 'ACTIVE'
            `;
            const frequencyOverrideResult = await client.query(frequencyOverrideQuery, [savingsProduct.id, account.branch]);

            if (frequencyOverrideResult.rowCount > 0) {
                const frequencyOverride = frequencyOverrideResult.rows[0];
                savingsProduct.compulsorydepositfrequency = frequencyOverride.compulsorydepositfrequency; // Apply frequency override
                console.log('Frequency override applied:', savingsProduct.compulsorydepositfrequency);
            }

            // Check if savings product is inactive
            if (savingsProduct.status !== 'ACTIVE') {
                // If savings product is inactive, save the transaction as failed
                await saveFailedTransaction(client, req, res, 'Inactive savings product', await generateNewReference(client, accountnumber, req, res), whichaccount);
                await client.query('COMMIT'); // Commit the transaction
                await activityMiddleware(req, req.user.id, 'Transaction committed after inactive savings product', 'TRANSACTION');
                req.transactionError = {
                    status: StatusCodes.EXPECTATION_FAILED,
                    message: 'Savings product is not active.',
                    errors: ['Inactive savings product.']
                };
                req.body.transactiondesc += 'Savings product is not active.|';
                return next();
            }

            if (!currency || currency !== savingsProduct.currency) {
                transactionStatus = 'FAILED';
                reasonForRejection = 'Currency mismatch or not provided';
                // Immediately save the transaction as failed and stop processing
                await saveFailedTransaction(client, req, res, reasonForRejection, await generateNewReference(client, accountnumber, req, res), whichaccount);
                await client.query('COMMIT'); // Commit the transaction
                await activityMiddleware(req, req.user.id, 'Transaction committed after currency mismatch', 'TRANSACTION');
                req.transactionError = {
                    status: StatusCodes.EXPECTATION_FAILED,
                    message: 'Transaction failed due to currency mismatch.',
                    errors: ['Currency mismatch or not provided.']
                };
                return next();
            }    

            // Handle credit and debit for savings account
            await savingsCredit(client, req, res, next, accountnumber, credit, description, ttype, transactionStatus, savingsProduct, whichaccount, req.user.id);
            await savingsDebit(client, req, res, next, accountnumber, debit, description, ttype, transactionStatus, savingsProduct, whichaccount, accountuser);
        }

        // Handle transactions for personal accounts
        if (whichaccount === 'PERSONAL') {            
            await personalCredit(client, req, res, next, req.body.personalaccountnumber, credit, description, ttype, transactionStatus, whichaccount);
            await personalDebit(client, req, res, next, req.body.personalaccountnumber, debit, description, ttype, transactionStatus, whichaccount);
        }     

        // Handle transactions for loan accounts
        if (whichaccount === 'LOAN') {
            await loanCredit(client, req, res, next, req.body.loanaccountnumber, credit, description, ttype, transactionStatus, whichaccount);
        }
        
        // Log activity for successful transaction save
        await activityMiddleware(req, req.user.id, 'Transaction saved successfully', 'TRANSACTION');

        await client.query('COMMIT'); // Commit the transaction
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback the transaction on error
        console.error('Transaction failed at:', error.stack);
        
        // Logic to save failed transaction with reason for rejection
        if (reasonForRejection) {
            await saveFailedTransaction(client, req, res, reasonForRejection, await generateNewReference(client, accountnumber, req, res), whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            req.transactionError = {
                status: StatusCodes.EXPECTATION_FAILED,
                message: 'Transaction processing failed.',
                errors: [error.message]
            };
        }
 
        // If tfrom is BANK, save the transaction to default_excess_account
        if (tfrom === 'BANK') {
            const excessAccountNumber = orgSettings.default_excess_account;
            req.body.transactiondesc += `Original Account Number: ${accountnumber}, Description: ${description}, Branch: ${branch}, Registration Point: ${registrationpoint}`;
            await saveTransaction(client, res, {
                accountnumber: excessAccountNumber,
                credit,
                debit,
                description,
                ttype,
                status: transactionStatus,
                whichaccount
            }, req);
            await client.query('COMMIT'); // Commit the transaction
        }
        
        req.transactionError = {
            status: StatusCodes.EXPECTATION_FAILED,
            message: 'Transaction processing failed.',
            errors: [error.message]
        };
    } finally {
        return next(); // Proceed to the next middleware
    }
};

module.exports = saveTransactionMiddleware; // Export the middleware function