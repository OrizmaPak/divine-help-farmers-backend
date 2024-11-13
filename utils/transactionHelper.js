const { StatusCodes } = require('http-status-codes');
const { activityMiddleware } = require('../middleware/activity');


// Function to save failed transaction with reason for rejection
const saveFailedTransaction = async (client, req, res, reasonForRejection, transactionReference, whichaccount) => {
    transactionReference = await generateNewReference(client, req.body.accountnumber, req, res);
    const createdBy = req.user.id || req.body.createdby || 0;
    let userid = 0;

    req.body.transactiondesc += `Transaction failed due to: ${reasonForRejection}.|`;

    if (req.body.tfrom === 'CASH') {
        // if (req.body.credit > 0) {
        //     // Redirect to default excess account
        //     const defaultExcessAccount = req.orgSettings.default_excess_account || '999999999';
        //     await  handleRedirection(client, req, res, userid, transactionReference, reasonForRejection, whichaccount);
        //     await client.query('COMMIT'); // Commit the transaction
        //     await activityMiddleware(req, req.user.id, 'Transaction committed after redirecting to default excess account', 'TRANSACTION');
        //     req.transactionError = {
        //         status: StatusCodes.MISDIRECTED_REQUEST,
        //         message: `Transaction has been redirected to the default excess account because ${reasonForRejection}`,
        //         errors: [`${reasonForRejection}. Transaction redirected to default excess account.`]
        //     };
        //     req.body.transactiondesc += 'This Deposit not allowed on this product.|';
        //     return;
        // } else if (req.body.debit > 0) {
            // Fail the transaction
            const status = 'FAILED';
            await client.query(
                `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, tfrom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), $13)`,
                [req.body.accountnumber, req.body.credit, req.body.debit, transactionReference, req.body.description, req.body.ttype, status, reasonForRejection, req.body.whichaccount, createdBy, req.body.currency, userid, req.body.tfrom]
            );
            req.transactionError = {
                status: StatusCodes.BAD_REQUEST,
                message: req.body.credit > 0 ? `Credit transaction failed because ${reasonForRejection}.` : `Debit transaction failed because ${reasonForRejection}.`,
                errors: [req.body.credit > 0 ? `Credit transaction failed because ${reasonForRejection}.` : `Debit transaction failed because ${reasonForRejection}.`]
            };
            req.body.transactiondesc += req.body.credit > 0 ? `Credit transaction failed because ${reasonForRejection}.|` : `Debit transaction failed because ${reasonForRejection}.|`;
            return;
        // }
    }

    if (req.body.tfrom === 'BANK') {
        // Redirect to default excess account
        const defaultExcessAccount = req.orgSettings.default_excess_account || '999999999';
        await handleRedirection(client, req, res, userid, transactionReference, reasonForRejection, req.body.whichaccount, req.body.credit);
        await client.query('COMMIT'); // Commit the transaction
        await activityMiddleware(req, req.user.id, 'Transaction committed after redirecting to default excess account', 'TRANSACTION');
        req.transactionError = {
            status: StatusCodes.MISDIRECTED_REQUEST,
            message: `Transaction has been redirected to the default excess account because ${reasonForRejection}`,
            errors: [`${reasonForRejection}. Transaction redirected to default excess account.`]
        };
        req.body.transactiondesc += `${reasonForRejection}. Transaction redirected to default excess account. |`;
        return;
    }
};

// Function to save pending transaction with reason for pending
const savePendingTransaction = async (client, accountnumber, credit, debit, transactionReference, description, ttype, reasonForRejection, status, whichaccount, req) => {
    const createdBy = req.user.id || req.body.createdby || 0;
    let userid = 0;

    // if (whichaccount !== 'GLACCOUNT') {
    //     const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
    //     const accountResult = await client.query(accountQuery, [accountnumber]);
    //     if (accountResult.rowCount !== 0) {
    //         userid = accountResult.rows[0].userid;
    //     }
    // }

    const valuedate = status === 'ACTIVE' ? new Date() : null;
    const newReference = await generateNewReference(client, accountnumber, req, res);
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, valuedate, tfrom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), $13, $14)`,
        [accountnumber, credit, debit, newReference, description, ttype, status, reasonForRejection, req.body.whichaccount, createdBy, req.body.currency, userid, valuedate, req.body.tfrom]
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
        console.log('description',   transactionData.description, req.body)
        const {
            accountnumber,
            credit = 0,
            debit = 0,
            reference,
            description = req.body ? req.body.description : '',
            ttype = req.body ? req.body.ttype : '',
            status = 'ACTIVE',
            transactiondate = req.body ? req.body.transactiondate || new Date() : new Date(),
            whichaccount = req.body.whichaccount,
            valuedate = req.body ? req.body.valuedate || new Date() : new Date(),
            transactiondesc = req.body ? req.body.transactiondesc || '' : '',
            currency = req.body ? req.body.currency : '',
            tfrom = req.body ? req.body.tfrom : ''
        } = transactionData;

        const createdBy = req.user.id || req.body.createdby || 0;
        let userid = 0;

        // if (whichaccount !== 'GLACCOUNT') {
        //     const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
        //     const accountResult = await client.query(accountQuery, [accountnumber]);
        //     if (accountResult.rowCount !== 0) {
        //         userid = accountResult.rows[0].userid;
        //     }
        // }

        const finalValuedate = status === 'ACTIVE' ? new Date() : null;
        const newReference = await generateNewReference(client, accountnumber, req, res);
        await client.query(
            `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondate, whichaccount, valuedate, transactiondesc, dateadded, createdby, currency, userid, tfrom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), $12, $13, $14, $15)`,
            [accountnumber, credit, debit, newReference, description, ttype, status, transactiondate, req.body.whichaccount, finalValuedate, transactiondesc, createdBy, currency, userid, tfrom]
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
                currency: req.body.currency,
                tfrom: req.body.tfrom
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
        req.body.whichaccount = 'PERSONAL';
    } 
    // Check if the account number is in the savings table
    if(!prefix && !identifier){
        const savingsQuery = `SELECT * FROM divine."savings" WHERE accountnumber = $1`;
        const savingsResult = await client.query(savingsQuery, [accountnumber]);
        if (savingsResult.rowCount !== 0) {
            console.log('orgSettings savings_transaction_prefix', req.orgSettings.savings_transaction_prefix) 
            prefix = req.orgSettings.savings_transaction_prefix;
            identifier = '1S2V3';
            req.body.whichaccount = 'SAVINGS';
        } else {
            // Check if the account number is in the Accounts table
            const accountsQuery = `SELECT * FROM divine."Accounts" WHERE accountnumber = $1`;
            const accountsResult = await client.query(accountsQuery, [accountnumber]);
            if (accountsResult.rowCount !== 0) {
                console.log('orgSettings gl_transaction_prefix', req.orgSettings.gl_transaction_prefix) 
                prefix = req.orgSettings.gl_transaction_prefix;
                identifier = '9G8L7';
                req.body.whichaccount = 'GLACCOUNT';
            } else {
                // Check if the account number is in the loan table
                const loanQuery = `SELECT * FROM divine."savings" WHERE accountnumber = $1`;
                const loanResult = await client.query(loanQuery, [accountnumber]);
                if (loanResult.rowCount !== 0) {
                    prefix = req.orgSettings.loan_transaction_prefix;
                    identifier = '4L5N6';
                    req.body.whichaccount = 'LOAN';
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

    // if(!prefix && !identifier){
    //     prefix = '000';
    //     identifier = '9U4K3N';
    // }

    console.log('whichaccount', req.body.whichaccount)

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

    // if (whichaccount !== 'GLACCOUNT') {
    //     const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
    //     const accountResult = await client.query(accountQuery, [req.body.accountnumber]);
    //     if (accountResult.rowCount !== 0) {
    //         userid = accountResult.rows[0].userid;
    //     } 
    // } 

    // save the transaction as redirect 
    console.log('credit', credit, req.body.credit)
    let status = req.body.status === 'REJECTED' ? 'REJECTED' : 'REDIRECTED';
    const newReference = await generateNewReference(client, req.body.accountnumber, req, res);
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, tfrom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), $13)`,
        [req.body.accountnumber, credit ? credit : req.body.credit, 0, newReference, req.body.description, req.body.ttype, 'REDIRECTED', transactiondesc, req.body.whichaccount, createdBy, req.body.currency, userid, req.body.tfrom]
    );
    req.body.transactiondesc += `Credit redirected from ${req.body.accountnumber} to personal account.|`;
    
    // Check if phone number is provided in the request body
    if (req.body.phone) {
        // Query the user table to find the user with the provided phone number
        const userQuery = `SELECT id, phone FROM divine."User" WHERE phone = $1`;
        const userResult = await client.query(userQuery, [req.body.phone]);

        if (userResult.rowCount > 0) {
            // If user is found, set the personal account number
        } else {
            // If user is not found, set the personal account number to the default excess account
            req.body.personalaccountnumber = req.orgSettings.default_excess_account || '999999999';
            req.body.transactiondesc += `User with phone number ${req.body.phone} not found. Personal account could not be found, redirected again to company's excess account.|`;
        }
    } else {
        // If phone number is not provided, set the personal account number to the default excess account
        req.body.personalaccountnumber = req.orgSettings.default_excess_account;
        req.body.transactiondesc += `Phone number not provided. Personal account could not be found, redirected again to company's excess account.|`;
    }
    status = req.body.status === 'REJECTED' ? 'REJECTED' : 'ACTIVE';
    const newPersonalReference = await generateNewReference(client, req.body.personalaccountnumber, req, res);
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, valuedate, tfrom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), now(), $13)`,
        [req.body.personalaccountnumber, credit ? credit : req.body.credit, 0, newPersonalReference, req.body.description, req.body.ttype, status, `Credit was to ${req.body.accountnumber}`, req.body.whichaccount, createdBy, req.body.currency, userid, req.body.tfrom]
    );
    
};

// Example function to handle excess account logic for credit
const handleRedirection = async (client, req, res, accountuser, reference, transactiondesc, whichaccount, credit, debit) => {
    // Implement logic for handling excess accounts
    const createdBy = req.user.id || req.body.createdby || 0;
    let userid = 0;

    // if (whichaccount !== 'GLACCOUNT') { 
    //     const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
    //     const accountResult = await client.query(accountQuery, [req.body.accountnumber]);
    //     if (accountResult.rowCount !== 0) {
    //         userid = accountResult.rows[0].userid;
    //     } 
    // } 

    // save the transaction as redirect 
    console.log('credit', credit, req.body.credit)
    let status = req.body.status === 'REJECTED' ? 'REJECTED' : 'REDIRECTED';
    const newReference = await generateNewReference(client, req.body.accountnumber, req, res);
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, tfrom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), $13)`,
        [req.body.accountnumber, credit ? credit : req.body.credit, debit ? debit : req.body.debit, newReference, req.body.description, req.body.ttype, 'REDIRECTED', transactiondesc, whichaccount, createdBy, req.body.currency, userid, req.body.tfrom]
    );
    if ((credit ? credit : req.body.credit) > 0) {
        req.body.transactiondesc += `Credit redirected from ${req.body.accountnumber} to personal account.|`;
    } else if ((debit ? debit : req.body.debit) > 0) {
        req.body.transactiondesc += `Debit redirected from ${req.body.accountnumber} to personal account.|`;
    }
    
    // Check if phone number is provided in the request body
    if (req.body.phone) {
        // Query the user table to find the user with the provided phone number
        const userQuery = `SELECT id, phone FROM divine."User" WHERE phone = $1`;
        const userResult = await client.query(userQuery, [req.body.phone]);

        if (userResult.rowCount > 0) {
            // If user is found, set the personal account number
        } else {
            // If user is not found, set the personal account number to the default excess account
            req.body.personalaccountnumber = req.orgSettings.default_excess_account || '999999999';
            req.body.transactiondesc += `User with phone number ${req.body.phone} not found. Personal account could not be found, redirected again to company's excess account.|`;
        }
    } else {
        // If phone number is not provided, set the personal account number to the default excess account
        req.body.personalaccountnumber = req.orgSettings.default_excess_account;
        req.body.transactiondesc += `Phone number not provided. Personal account could not be found, redirected again to company's excess account.|`;
    }
    status = req.body.status === 'REJECTED' ? 'REJECTED' : 'ACTIVE';
    const newPersonalReference = await generateNewReference(client, req.body.personalaccountnumber, req, res);
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, valuedate, tfrom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), now(), $13)`,
        [req.body.personalaccountnumber, credit ? credit : req.body.credit,  debit ? debit : req.body.debit, newPersonalReference, req.body.description, req.body.ttype, status, `Credit was to ${req.body.accountnumber}`, req.body.whichaccount, createdBy, req.body.currency, userid, req.body.tfrom]
    );
    
};

// Example function to handle excess account logic for debit
const handleDebitRedirectToPersonnalAccount = async (client, req, res, accountuser, reference, transactiondesc, whichaccount, debit) => {
    // Implement logic for handling excess accounts
    const createdBy = req.user.id || req.body.createdby || 0;
    let userid = 0;

    // if (whichaccount !== 'GLACCOUNT') {
    //     const accountQuery = `SELECT userid FROM divine."${whichaccount.toLowerCase()}" WHERE accountnumber = $1`;
    //     const accountResult = await client.query(accountQuery, [req.body.accountnumber]);
    //     if (accountResult.rowCount !== 0) {
    //         userid = accountResult.rows[0].userid;
    //     } 
    // } 

    // save the transaction as redirect 
    console.log('debit', debit, req.body.debit)
    let status = req.body.status === 'REJECTED' ? 'REJECTED' : 'REDIRECTED';
    const newReference = await generateNewReference(client, req.body.accountnumber, req, res);
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, tfrom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), $13)`,
        [req.body.accountnumber, 0, debit ? debit : req.body.debit, newReference, req.body.description, req.body.ttype, 'REDIRECTED', transactiondesc, whichaccount, createdBy, req.body.currency, userid, req.body.tfrom]
    );
    req.body.transactiondesc += `Debit redirected from ${req.body.accountnumber} to personal account.|`;

    // Check if phone number is provided in the request body
    if (!req.body.phone) {
        // Query the user table to find the user with the provided phone number
        const userQuery = `SELECT id, phone FROM divine."User" WHERE phone = $1`;
        const userResult = await client.query(userQuery, [req.body.phone]);

        if (userResult.rowCount > 0) {
            // If user is found, set the personal account number
            if (req.orgSettings.personal_account_overdrawn) {
                const personalAccountQuery = `SELECT SUM(credit) - SUM(debit) as balance FROM divine."transaction" WHERE accountnumber = $1`;
                const personalAccountResult = await client.query(personalAccountQuery, [req.body.personalaccountnumber]);
                const personalAccountBalance = personalAccountResult.rows[0].balance;
        
                if (personalAccountBalance <= 0) {
                    status = 'PENDING';
                }
            }
        } else {
            // If user is not found, set the personal account number to the default excess account
            req.body.personalaccountnumber = req.orgSettings.default_excess_account || '999999999';
            req.body.transactiondesc += `User with phone number ${req.body.phone} not found. Personal account could not be found, redirected again to company's excess account.|`;
        }
    } else {
        // If phone number is not provided, set the personal account number to the default excess account
        req.body.personalaccountnumber = req.orgSettings.default_excess_account;
        req.body.transactiondesc += `Phone number not provided. Personal account could not be found, redirected again to company's excess account.|`;
    }

    if (req.body.status === 'REJECTED') {
        status = 'REJECTED';
    } else if (status === 'PENDING') {
        status = 'PENDING';
    } else {
        status = 'ACTIVE';
    }
    
    const newPersonalReference = await generateNewReference(client, req.body.personalaccountnumber, req, res);
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount, dateadded, createdby, currency, userid, transactiondate, valuedate, tfrom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, now(), now(), $13)`,
        [req.body.personalaccountnumber, 0, debit ? debit : req.body.debit, newPersonalReference, req.body.description, req.body.ttype, status, `Debit was to ${req.body.accountnumber}`, req.body.whichaccount, createdBy, req.body.currency, userid, req.body.tfrom]
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
    handleRedirection,
    applyMinimumCreditAmountPenalty
    // generateDates, // Uncomment if needed
};