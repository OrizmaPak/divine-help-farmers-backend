const { StatusCodes } = require('http-status-codes');
const { activityMiddleware } = require('../middleware/activity');


// Function to save failed transaction with reason for rejection
const saveFailedTransaction = async (client, req, res, reasonForRejection, transactionReference, whichaccount) => {
    transactionReference = await generateNewReference(client, req.body.accountnumber, req, res);
    const createdBy = req.user.id || req.body.createdby || 0;
    let userid = 0;
    
    if (whichaccount !== 'GLACCOUNT') {
        const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
        const accountResult = await client.query(accountQuery, [req.body.accountnumber]);
        if (accountResult.rowCount !== 0) {
            userid = accountResult.rows[0].userid;
        }
    }

    req.body.transactiondesc += `Transaction failed due to: ${reasonForRejection}.|`;
    
    if (req.body.tfrom === 'CASH') {
        await client.query(
            `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate) VALUES ($1, $2, $3, $4, $5, $6, 'FAILED', $7, $8, now(), $9, $10, $11, now())`,
            [req.body.accountnumber, req.body.credit, req.body.debit, transactionReference, req.body.description, req.body.ttype, reasonForRejection, whichaccount, createdBy, req.body.currency, userid]
        );
        // req.body.transactiondesc += `Transaction failed due to: ${reasonForRejection}.|`;
        console.log('transactionReference', transactionReference, typeof transactionReference ) 
        // Extract the link part from the reference
        const referenceParts = await transactionReference.toString().split('|');
        console.log('referenceParts', referenceParts)
        const link = referenceParts.find(part => part.startsWith('L'));
        
        if (!link) {
            // Handle the case where the link is not found in the reference 
            req.transactionError = {
                status: StatusCodes.BAD_REQUEST,
                message: 'Invalid reference format: link not found to update status to failed.',
                errors: ['Invalid reference format: link not found to update status to failed.']
            };
            req.body.transactiondesc += 'Invalid reference format: link not found to update status to failed.|';
            return;
        }
        
        // Check if tfrom is CASH, then update all transactions where the reference contains the link to 'FAILED'
        await client.query(
            `UPDATE divine."transaction" SET status = 'FAILED' WHERE reference LIKE '%' || $1 || '%'`,
            [link]
        );
    }
    
    // Check if tfrom is BANK, then redirect to personal account
    if (req.body.tfrom === 'BANK') {
        await handleCreditRedirectToPersonnalAccount(client, req, res, userid, transactionReference, reasonForRejection, whichaccount, req.body.credit);
        await client.query('COMMIT'); // Commit the transaction
        await activityMiddleware(req, req.user.id, 'Transaction committed after redirecting to personal account', 'TRANSACTION');
        req.transactionError = {
            status: StatusCodes.MISDIRECTED_REQUEST,
            message: 'Transaction has been redirected to the personal account because the savings account is restricted from taking this deposits.',
            errors: ['Deposits not allowed on this product. Transaction redirected to personal account.']
        };
        req.body.transactiondesc += 'This Deposit not allowed on this product.|';
        return;
    }
};

// Function to save pending transaction with reason for pending
const savePendingTransaction = async (client, accountnumber, credit, debit, transactionReference, description, ttype, reasonForRejection, status, whichaccount, req) => {
    const createdBy = req.user.id || req.body.createdby || 0;
    let userid = 0;

    if (whichaccount !== 'GLACCOUNT') {
        const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
        const accountResult = await client.query(accountQuery, [accountnumber]);
        if (accountResult.rowCount !== 0) {
            userid = accountResult.rows[0].userid;
        }
    }

    const valuedate = status === 'ACTIVE' ? new Date() : null;
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, valuedate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), $13)`,
        [accountnumber, credit, debit, transactionReference, description, ttype, status, reasonForRejection, whichaccount, createdBy, req.body.currency, userid, valuedate]
    );
    req.body.transactiondesc += `Transaction pending due to: ${reasonForRejection}.|`;
    if (req && req.reference && ttype !== 'CHARGE') {
        await client.query(
            `UPDATE divine."transaction" SET status = 'FAILED' WHERE reference LIKE $1`,
            [req.reference + '%']
        );
    }
};

// Function to save a transaction
const saveTransaction = async (client, res, transactionData, req) => {
    try {
        // console.log('description',  credit)
        const {
            accountnumber,
            credit=0,
            debit=0,
            reference,
            description = req.body.description,
            ttype = req.body.ttype,
            status = 'ACTIVE',
            transactiondate = req.body.transactiondate || new Date(),
            whichaccount,
            valuedate = req.body.valuedate || new Date(),
            transactiondesc = req.body.transactiondesc || '',
            currency = req.body.currency
        } = transactionData;

        const createdBy = req.user.id || req.body.createdby || 0;
        let userid = 0;

        if (whichaccount !== 'GLACCOUNT') {
            const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
            const accountResult = await client.query(accountQuery, [accountnumber]);
            if (accountResult.rowCount !== 0) {
                userid = accountResult.rows[0].userid;
            }
        }

        const finalValuedate = status === 'ACTIVE' ? new Date() : null;

        await client.query(
            `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondate, whichaccount, valuedate, transactiondesc, dateadded, createdby, currency, userid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12, $13, $14)`,
            [accountnumber, credit, debit, await generateNewReference(client, accountnumber, req, res), description, ttype, status, transactiondate, whichaccount, finalValuedate, transactiondesc, createdBy, currency, userid]
        );
        req.body.transactiondesc += 'Transaction saved successfully.|';
    } catch (error) {
        console.error('Error saving transaction:', error.stack);
        req.body.transactiondesc += `Transaction failed due to error: ${error.message}.|`;
        throw new Error('Transaction failed due to error.');
    }
};

// Helper function for calculating charges
const calculateCharge = (product, amount) => {
    if (product.depositchargetype === 'PERCENTAGE') {
        return (product.depositcharge / 100) * amount;
    }
    return product.depositcharge;
};


const applyMinimumCreditAmountPenalty = async (client, req, res, orgSettings) => {
    if (req.body.credit < orgSettings.minimum_credit_amount) {
        const penaltyAmount = orgSettings.minimum_credit_amount_penalty;
        const defaultIncomeAccountNumber = orgSettings.default_income_account;
        const incomeAccountQuery = `SELECT * FROM divine."Accounts" WHERE accountnumber = $1`;
        const incomeAccountResult = await client.query(incomeAccountQuery, [defaultIncomeAccountNumber]);
    
        if (incomeAccountResult.rowCount === 0) {
            req.body.transactiondesc += 'Default income account does not exist. Please contact support for assistance.|';
            // throw new Error('Default income account does not exist. Please contact support for assistance.');
        } else {
            console.log('Penalty Amount:', penaltyAmount);
    
            await saveTransaction(client, res, {
                accountnumber: defaultIncomeAccountNumber,
                credit: penaltyAmount,
                debit: 0,
                reference: await generateNewReference(client, defaultIncomeAccountNumber, req, res),
                description: 'Minimum Credit Amount Penalty',
                ttype: 'PENALTY',
                status: 'ACTIVE',
                transactiondesc: 'Minimum Credit Amount Penalty',
                whichaccount: 'GLACCOUNT',
                currency: req.body.currency
            }, req);
            req.body.transactiondesc += `Penalty of ${penaltyAmount} has been deducted.|`;
            req.body.credit = req.body.credit - penaltyAmount;
            await activityMiddleware(req, req.user.id, 'Penalty transaction saved', 'TRANSACTION');
        }
    }
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
const generateNewReference = async (client, accountnumber, req, res) => {
    // prefix|'L'link|timestamp|identifier
    let prefix = '';
    let identifier = '';
    let link = '';

    console.log('accontnumber when generating ref', accountnumber)

    if (accountnumber.toString().startsWith(req.orgSettings.personal_account_prefix)) {
        // Check if the account number starts with personal account prefix
        console.log('orgSettings personal_transaction_prefix', req.orgSettings.personal_transaction_prefix) 
        prefix = req.orgSettings.personal_transaction_prefix;
        identifier = '7P8L9';
    } 
    // Check if the account number is in the savings table
    if(!prefix && !identifier){
        const savingsQuery = `SELECT * FROM divine."savings" WHERE accountnumber = $1`;
        const savingsResult = await client.query(savingsQuery, [accountnumber]);
        if (savingsResult.rowCount !== 0) {
            console.log('orgSettings savings_transaction_prefix', req.orgSettings.savings_transaction_prefix) 
            prefix = req.orgSettings.savings_transaction_prefix;
            identifier = '1S2V3';
        } else {
            // Check if the account number is in the Accounts table
            const accountsQuery = `SELECT * FROM divine."Accounts" WHERE accountnumber = $1`;
            const accountsResult = await client.query(accountsQuery, [accountnumber]);
            if (accountsResult.rowCount !== 0) {
                console.log('orgSettings gl_transaction_prefix', req.orgSettings.gl_transaction_prefix) 
                prefix = req.orgSettings.gl_transaction_prefix;
                identifier = '9G8L7';
            } else {
                // Check if the account number is in the loan table
                const loanQuery = `SELECT * FROM divine."loan" WHERE accountnumber = $1`;
                const loanResult = await client.query(loanQuery, [accountnumber]);
                if (loanResult.rowCount !== 0) {
                    prefix = req.orgSettings.loan_transaction_prefix;
                    identifier = '4L5N6';
                } else {
                    // If the account number can't be matched to anything, throw a response
                    req.transactionError = {
                        status: StatusCodes.BAD_REQUEST,
                        message: 'Invalid account number.',
                        errors: ['Account number does not match any known account types while trying to generate reference.']
                    };
                    req.body.transactiondesc += 'Invalid account number.|';
                    return;
                }
            }
        }
    }

    // Check if the needed prefix is set, if not return response
    if (!prefix) {
       req.transactionError = {
            status: StatusCodes.BAD_REQUEST,
            message: 'Transaction prefix not set.',
            errors: ['The required transaction prefix is not set for the account type.']
        };
        req.body.transactiondesc += 'Transaction prefix not set.|';
        return;
    }

    // Generate the link
    const timestamp = new Date().getTime();
    if (req.body.reference) {
        link = req.body.reference.split('|')[1] || `L${timestamp}`;
    } else {
        link = `L${timestamp}`;
    }

    // Construct the new reference
    const newReference = `${prefix}|${link}|${timestamp}|${identifier}`;
    req.body.reference = newReference;
    console.log('newReference', newReference)
    return newReference;
}; 

// Example of sending notifications
const sendNotification = async (user, transaction) => {
    // Implement your notification logic here
}; 
 
// Example function to handle excess account logic for credit
const handleCreditRedirectToPersonnalAccount = async (client, req, res, accountuser, reference, transactiondesc, whichaccount, credit) => {
    // Implement logic for handling excess accounts
    const createdBy = req.user.id || req.body.createdby || 0;
    let userid = 0;

    if (whichaccount !== 'GLACCOUNT') {
        const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
        const accountResult = await client.query(accountQuery, [req.body.accountnumber]);
        if (accountResult.rowCount !== 0) {
            userid = accountResult.rows[0].userid;
        } 
    } 

    // save the transaction as redirect 
    console.log('credit', credit, req.body.credit)
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now())`,
        [req.body.accountnumber, credit ? credit : req.body.credit, 0, await generateNewReference(client, req.body.accountnumber, req, res), req.body.description, req.body.ttype, 'REDIRECTED', transactiondesc, whichaccount, createdBy, req.body.currency, userid]
    );
    req.body.transactiondesc += `Credit redirected from ${req.body.accountnumber} to personal account.|`;
 
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, valuedate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), now())`,
        [req.body.personalaccountnumber, credit ? credit : req.body.credit, 0, await generateNewReference(client, req.body.personalaccountnumber, req, res), req.body.description, req.body.ttype, 'ACTIVE', `Credit was to ${req.body.accountnumber}`, 'PERSONAL', createdBy, req.body.currency, userid]
    );
    
};

// Example function to handle excess account logic for debit
const handleDebitRedirectToPersonnalAccount = async (client, req, res, accountuser, reference, transactiondesc, whichaccount, debit) => {
    // Implement logic for handling excess accounts
    const createdBy = req.user.id || req.body.createdby || 0;
    let userid = 0;

    if (whichaccount !== 'GLACCOUNT') {
        const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
        const accountResult = await client.query(accountQuery, [req.body.accountnumber]);
        if (accountResult.rowCount !== 0) {
            userid = accountResult.rows[0].userid;
        } 
    } 

    // save the transaction as redirect 
    console.log('debit', debit, req.body.debit)
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now())`,
        [req.body.accountnumber, 0, debit ? debit : req.body.debit, await generateNewReference(client, req.body.accountnumber, req, res), req.body.description, req.body.ttype, 'REDIRECTED', transactiondesc, whichaccount, createdBy, req.body.currency, userid]
    );
    req.body.transactiondesc += `Debit redirected from ${req.body.accountnumber} to personal account.|`;
 
    let status = 'ACTIVE';
    if (!req.orgSettings.personal_account_overdrawn) {
        const personalAccountQuery = `SELECT SUM(credit) - SUM(debit) as balance FROM divine."transaction" WHERE accountnumber = $1`;
        const personalAccountResult = await client.query(personalAccountQuery, [req.body.personalaccountnumber]);
        const personalAccountBalance = personalAccountResult.rows[0].balance;

        if (personalAccountBalance <= 0) {
            status = 'PENDING';
        }
    }

    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, valuedate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), now())`,
        [req.body.personalaccountnumber, 0, debit ? debit : req.body.debit, await generateNewReference(client, req.body.personalaccountnumber, req, res), req.body.description, req.body.ttype, status, `Debit was to ${req.body.accountnumber}`, 'PERSONAL', createdBy, req.body.currency, userid]
    );
    
};

function calculateWithdrawalLimit(savingsProduct, currentBalance) {
    if (savingsProduct.withdrawallimittype === 'PERCENTAGE') {
        return currentBalance * (savingsProduct.withdrawallimit / 100);
    } else if (savingsProduct.withdrawallimittype === 'AMOUNT') {
        return savingsProduct.withdrawallimit;
    }
    return 0; // Default to 0 if no valid limit type is specified
}

// Example function to generate dates for compulsory deposits
// const generateDates = () => {
//     // Implement logic to generate dates
//     return { lastDate: new Date(), nextDate: new Date() }; // Replace with actual logic
// };

// Export all functions
module.exports = {
    saveFailedTransaction,
    savePendingTransaction,
    saveTransaction,
    calculateCharge,
    calculatePenalty,
    calculateTax,
    generateNewReference,
    handleDebitRedirectToPersonnalAccount,
    sendNotification,
    calculateWithdrawalLimit,
    handleCreditRedirectToPersonnalAccount,
    applyMinimumCreditAmountPenalty
    // generateDates, // Uncomment if needed
};