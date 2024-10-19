// Function to save failed transaction with reason for rejection
const saveFailedTransaction = async (client, req, reasonForRejection, transactionReference, whichaccount) => {
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount) VALUES ($1, $2, $3, $4, $5, $6, 'FAILED', $7, $8)`,
        [req.body.accountnumber, req.body.credit, req.body.debit, transactionReference, req.body.description, req.body.ttype, reasonForRejection, whichaccount]
    );
    if (req.body.reference) {
        await client.query(
            `UPDATE divine."transaction" SET status = 'FAILED' WHERE reference LIKE $1`,
            [req.body.reference + '%']
        );
    }
};

// Function to save pending transaction with reason for pending
const savePendingTransaction = async (client, accountnumber, credit, debit, transactionReference, description, ttype, reasonForRejection, status, whichaccount, req) => {
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [accountnumber, credit, debit, transactionReference, description, ttype, status, reasonForRejection, whichaccount]
    );
    if (req && req.reference && ttype !== 'CHARGE') {
        await client.query(
            `UPDATE divine."transaction" SET status = 'FAILED' WHERE reference LIKE $1`,
            [req.reference + '%']
        );
    }
};

// Function to save a transaction
const saveTransaction = async (client, transactionData, req) => {
    const {
        accountnumber,
        credit = 0,
        debit = 0,
        reference,
        description = req.body.description,
        ttype = req.body.ttype,
        status = 'ACTIVE',
        transactiondate = req.body.transactiondate || new Date(),
        whichaccount,
        valuedate = req.body.valuedate || new Date(),
        transactiondesc = req.body.transactiondesc || ''
    } = transactionData;

    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondate, whichaccount, valuedate, transactiondesc) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [accountnumber, credit, debit, generateNewReference(reference), description, ttype, status, transactiondate, whichaccount, valuedate, transactiondesc]
    );
};

// Helper function for calculating charges
const calculateCharge = (product, amount) => {
    if (product.depositchargetype === 'PERCENTAGE') {
        return (product.depositcharge / 100) * amount;
    }
    return product.depositcharge;
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
const generateNewReference = (reference) => {
    return `${reference}`+'-'+`${new Date().getTime()}`; // Append timestamp to create a unique reference
};

// Example of sending notifications
const sendNotification = async (user, transaction) => {
    // Implement your notification logic here
};

// Example function to handle excess account logic
const handleCreditRedirectToPersonnalAccount = async (client, req, accountuser, reference, transactiondesc, whichaccount, credit) => {
    // Implement logic for handling excess accounts
    // save the transaction as redirect
    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [req.body.accountnumber, credit, 0, generateNewReference(reference), req.body.description, req.body.ttype, 'REDIRECTED', transactiondesc, whichaccount]
    );

    await client.query(
        `INSERT INTO divine."transaction" (accountnumber, credit, debit, reference, description, ttype, status, transactiondesc, whichaccount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [req.body.personnalaccountnumber, credit, 0, generateNewReference(reference), req.body.description, req.body.ttype, 'ACTIVE', `Credit was to ${req.body.accountnumber}`, whichaccount]
    );
    
};

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
    sendNotification,
    handleCreditRedirectToPersonnalAccount,
    // generateDates, // Uncomment if needed
};