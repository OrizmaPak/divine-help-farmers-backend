const pg = require('../../db/pg'); // Use your existing pg setup
const { StatusCodes } = require('http-status-codes'); // Assuming you are using http-status-codes for status codes
const {activityMiddleware} = require('../activity'); // Import activity middleware
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
            branch = '',
            registrationpoint = '',
            ttype,
            tfrom,
            tax = false,
        } = req.body;

        let whichaccount;
        let accountuser;
        let personnalaccount

        // Log activity
        await activityMiddleware(req, req.user.id, 'Attempting to save transaction', 'TRANSACTION');
        
        // 4. Generate a transaction reference if not provided
        // let transactionReference = reference??'';

        // 7. Check for back-dated or future transactions
        const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings" LIMIT 1`;
        const orgSettingsResult = await client.query(orgSettingsQuery);
        if (orgSettingsResult.rowCount === 0) {
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
        const orgSettings = orgSettingsResult.rows[0];
        req['orgSettings'] = orgSettings;

        // 3. Check if both credit and debit are greater than zero
        if (credit > 0 && debit > 0) {
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
        i}

        // 1. Validate the account number and status
        const accountQuery = `SELECT * FROM divine."savings" WHERE accountnumber = $1`;
        let parsedAccountNumber = accountnumber;
        if (isNaN(accountnumber)) {
            parsedAccountNumber = parseInt(accountnumber, 10);
            if (isNaN(parsedAccountNumber)) {
                parsedAccountNumber = '0000000000';
            }
        }
        const accountResult = await client.query(accountQuery, [parsedAccountNumber]);
        if (accountResult.rowCount !== 0) {
            whichaccount = 'SAVINGS';
        } else if (accountnumber.startsWith(orgSettings.personal_account_prefix)) {
            const phoneNumber = accountnumber.substring(orgSettings.personal_account_prefix.length);
            const userQuery = `SELECT * FROM divine."User" WHERE phone = $1`;
            const userResult = await client.query(userQuery, [phoneNumber]);
            if (userResult.rowCount === 0) {
                // await client.query('ROLLBACK'); // Rollback the transaction
                await saveFailedTransaction(client, req, res, 'Invalid personal account number', await generateNewReference(client, accountnumber, req, res), whichaccount);
                await client.query('COMMIT'); // Commit the transaction
                await activityMiddleware(req, req.user.id, 'Transaction failed due to invalid personal account number', 'TRANSACTION');
                req.transactionError = {
                    status: StatusCodes.EXPECTATION_FAILED,
                    message: 'Invalid personal  or savings account number.',
                    errors: ['Account not found.']
                }; 
                req.body.transactiondesc += 'Invalid personal  or savings account number.|';
                // return next(); 
            }
            whichaccount = 'PERSONAL';
            const accountuser = userResult.rows[0]; // Save the user data in accountuser variable
        }
        // establish the personal accountnumber
        req.body['personalaccountnumber'] = `${orgSettings.personal_account_prefix}${user.phone}`
        req.body.phone = user.phone;
        personnalaccount = `${orgSettings.personal_account_prefix}${user.phone}`

        if (accountResult.rowCount === 0 && !accountnumber.startsWith(orgSettings.personal_account_prefix)) {
            await saveFailedTransaction(client, req, res, 'Invalid account number', await generateNewReference(client, accountnumber, req, res), whichaccount);
            await client.query('COMMIT'); // Commit the transaction
            await activityMiddleware(req, req.user.id, 'Transaction committed after invalid personnal account number', 'TRANSACTION');
            req.transactionError = {
                status: StatusCodes.EXPECTATION_FAILED,
                message: 'Invalid account number.',
                errors: ['Account not found.']
            };
            req.body.transactiondesc += 'Invalid account number.|';
            return next();
        }

          // 5. Initialize transaction status and reason for rejection
          let transactionStatus = 'PENDING';
          let reasonForRejection = '';
          let reasonForPending = '';

           // 6. Check for currency mismatch     
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
            req.body.status = 'REJECTED'
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
            accountuser = accountResult.rows[0];
            console.log('as e dey hot', accountuser);
            req.body['userid'] = accountuser.userid;
       

            const account = accountResult.rows[0];
            if (account.status !== 'ACTIVE') {
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

            // 2. Validate the savings product
            const savingsProductQuery = `SELECT * FROM divine."savingsproduct" WHERE id = $1`;
            const savingsProductResult = await client.query(savingsProductQuery, [account.savingsproductid]);
            if (savingsProductResult.rowCount === 0) {
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

            const savingsProduct = savingsProductResult.rows[0];
            if (savingsProduct.status !== 'ACTIVE') {
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
                // req.body.transactiondesc += 'Transaction failed due to currency mismatch.|';
                return next();
            }    

            // WHERE CREDIT AND DEBIT IS HANDLED

            
            
            // Group transactions based on credit and debit
            await savingsCredit(client, req, res, next, accountnumber, credit, description, ttype, transactionStatus, savingsProduct, whichaccount, req.user.id);
    
            await savingsDebit(client, req, res, next, accountnumber, debit, description, ttype, transactionStatus, savingsProduct, whichaccount, accountuser);
 
        }


        if (whichaccount === 'PERSONAL') {            
                await personalCredit(client, req, res, next, req.body.personalaccountnumber, credit, description, ttype, transactionStatus, whichaccount);
                await personalDebit(client, req, res, next, req.body.personalaccountnumber, debit, description, ttype, transactionStatus, whichaccount);
        }     
        


        // Log activity
        await activityMiddleware(req, req.user.id, 'Transaction saved successfully', 'TRANSACTION');

        await client.query('COMMIT'); // Commit the transaction
        // res.status(StatusCodes.CREATED).json({ transaction: creditTransaction || debitTransaction });
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
        return next();
    }
};



module.exports = saveTransactionMiddleware;