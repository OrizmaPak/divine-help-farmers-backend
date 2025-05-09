const pg = require("../../db/pg");
const { generateNewReference } = require("../../utils/transactionHelper");
const { activityMiddleware } = require("../activity");
const saveTransactionMiddleware = require("./transaction");

// for performing two way transaction
async function performTransaction(from, to, fromuser=0, touser=0) {
    // Restructure the 'from' and 'to' transactions to include 'user' and 'body'
    const fromTransaction = {
        user: { id: fromuser },
        body: { ...from }
    };

    const toTransaction = {
        user: { id: touser },
        body: { ...to }
    };

    // Mock response object
    const res = {
        status: (code) => ({
            json: (data) => console.log('Response:', code, data)
        })
    };

    try {
        // Step 1: Log the transaction attempt in the activity
        await activityMiddleware(fromTransaction, fromuser, 'Attempting to perform transaction', 'TRANSACTION');

        // Step 2: Save the 'from' transaction
        await saveTransactionMiddleware(fromTransaction, res, () => {
            console.log('From Transaction Reference:', fromTransaction.body.reference, fromTransaction.body);
        });

        // Check if 'from' transaction generated a reference
        if (!fromTransaction.body.reference) {
            console.error('From transaction did not generate a reference.');
            return { status: false, reference: [] };
        }

        // Step 3: Assign the 'from' reference to the 'to' transaction
        toTransaction.body.reference = fromTransaction.body.reference;

        // Step 4: Save the 'to' transaction 
        await saveTransactionMiddleware(toTransaction, res, () => {
            console.log('To Transaction Reference:', toTransaction.body.reference);
        });

        // Check if 'to' transaction generated a reference
        if (!toTransaction.body.reference) {
            console.error('To transaction did not generate a reference. Initiating rollback.');

            // Determine the reversal type based on the original transaction type
            const reversalType = fromTransaction.body.ttype === 'DEBIT' ? 'CREDIT' : 'DEBIT';

            // Create a reversal transaction object
            const reversalTransaction = {
                user: { id: 0 },
                body: {
                    ...fromTransaction.body,
                    ttype: reversalType,
                    reference: fromTransaction.body.reference, // Use the same reference for tracking
                }
            };

            // Step 5: Attempt to rollback the 'from' transaction
            await saveTransactionMiddleware(reversalTransaction, res, () => {
                console.log('Reversal Transaction Reference:', reversalTransaction.body.reference);
            });

            // Log the rollback activity
            await activityMiddleware(reversalTransaction, 0, 'Rolled back the from transaction due to failure in to transaction', 'TRANSACTION_ROLLBACK');

            return { status: false, reference: [] };
        }

        // Step 6: Log the successful transaction in the activity
        await activityMiddleware(fromTransaction, 0, 'Transaction performed successfully', 'TRANSACTION');

        return { status: true, reference: [fromTransaction.body.reference, toTransaction.body.reference] };

    } catch (error) {
        console.error('Error performing transaction:', error);

        // Log the error in the activity
        await activityMiddleware(fromTransaction, 0, 'Error performing transaction', 'TRANSACTION_ERROR');

        return { status: false, reference: [] };
    }
}

// for performing one way transaction
async function performTransactionOneWay(transaction, personel=0) {
    // Restructure the transaction to include 'user' and 'body'
    const transactionData = {
        user: { id: personel },
        body: { ...transaction }
    };

    // Mock response object
    const res = {
        status: (code) => ({
            json: (data) => console.log('Response:', code, data)
        })
    };

    try {
        // Step 1: Log the transaction attempt in the activity
        await activityMiddleware(transactionData, 0, 'Attempting to perform transaction', 'TRANSACTION');

        // Step 2: Save the transaction
        await saveTransactionMiddleware(transactionData, res, () => {
            console.log('Transaction Reference:', transactionData.body.reference);
        });

        // Check if transaction generated a reference
        if (!transactionData.body.reference) {
            console.error('Transaction did not generate a reference.');
            return { status: false, reference: [] };
        }

        // Step 3: Log the successful transaction in the activity
        await activityMiddleware(transactionData, personel, 'Transaction performed successfully', 'TRANSACTION');
        
        return { status: true, reference: [transactionData.body.reference] };

    } catch (error) {
        console.error('Error performing transaction:', error);

        // Log the error in the activity
        await activityMiddleware(transactionData, personel, 'Error performing transaction', 'TRANSACTION_ERROR');
        
        return { status: false, reference: [] };
    }
}

// Automatically set a cron job to send notification of the charges
const schedule = require("node-schedule");

async function interbankIncome(userid, phone, amount, amounttype = "CREDIT", balance, accountnumber) {
    try {
        // Validate required parameters
        if (!userid && (!phone || !amount || !balance)) {
            throw new Error('Missing required parameters: phone, amount, or balance.');
        }

        // Fetch phone if not provided
        if (userid && !phone) {
            const userQuery = {
                text: `SELECT phone FROM divine."User" WHERE id = $1 LIMIT 1`,
                values: [userid]
            };
            const { rows: userRows } = await pg.query(userQuery);
            if (userRows.length === 0) {
                throw new Error('User not found.');
            }
            phone = userRows[0].phone;
        }

        // Fetch organisation settings
        const orgSettingsQuery = {
            text: `SELECT personal_account_prefix, default_income_account, default_personal_account, credit_charge, credit_charge_type, debit_charge, debit_charge_type, credit_charge_minimum, credit_charge_maximum, debit_charge_minimum, debit_charge_maximum FROM divine."Organisationsettings" LIMIT 1`,
            values: []
        };
        const { rows: orgRows } = await pg.query(orgSettingsQuery);
        if (orgRows.length === 0) {
            throw new Error('Organisation settings not found.');
        }
        const personalAccountPrefix = orgRows[0].personal_account_prefix;
        const defaultIncomeAccount = orgRows[0].default_income_account;
        const defaultPersonalAccount = orgRows[0].default_personal_account;
        const creditCharge = orgRows[0].credit_charge;
        const creditChargeType = orgRows[0].credit_charge_type;
        const debitCharge = orgRows[0].debit_charge;
        const debitChargeType = orgRows[0].debit_charge_type;
        const creditChargeMinimum = orgRows[0].credit_charge_minimum;
        const creditChargeMaximum = orgRows[0].credit_charge_maximum;
        const debitChargeMinimum = orgRows[0].debit_charge_minimum;
        const debitChargeMaximum = orgRows[0].debit_charge_maximum;

        // Calculate transaction charge based on amount type
        let transactionCharge = 0;
        if (amounttype === "CREDIT") {
            transactionCharge = creditChargeType === 'PERCENTAGE' ? (amount * creditCharge / 100) : creditCharge;
            transactionCharge = Math.max(creditChargeMinimum, Math.min(transactionCharge, creditChargeMaximum));
        } else if (amounttype === "DEBIT") {
            transactionCharge = debitChargeType === 'PERCENTAGE' ? (amount * debitCharge / 100) : debitCharge;
            transactionCharge = Math.max(debitChargeMinimum, Math.min(transactionCharge, debitChargeMaximum));
        }

        // Adjust amount based on transaction charge
        const adjustedAmount = amount - transactionCharge;

        // Construct account number
        const accountNumber = `${personalAccountPrefix}${phone}`;



        // Generate references for transactions
        const debitReference = await generateNewReference(pg, accountNumber, {body:{whichaccount:''}});
        pg.body.reference = debitReference;
        const creditReference = await generateNewReference(pg, defaultIncomeAccount, {body:{whichaccount:''}});
        const defaultPersonalDebitReference = await generateNewReference(pg, defaultPersonalAccount, {body:{whichaccount:''}});

        // Create transactions
        const transactionData = {
            description: 'Interbank Income from '+accountnumber+' '+amounttype+'ED',
            transactiondesc: 'Interbank Income from '+accountnumber+' '+amounttype+'ED',
            transactionref: '',
            currency: 'NGN'
        };

        const debitTransaction = {
            accountnumber: accountNumber,
            userid: userid || 0, 
            description: transactionData.description + ' Debit',
            debit: adjustedAmount,
            credit: 0,
            ttype: "DEBIT",
            tfrom: 'BANK',
            createdby: 0,
            valuedate: new Date(),
            reference: debitReference,
            transactiondate: new Date(),
            transactiondesc: transactionData.transactiondesc + ' Debit',
            transactionref: transactionData.transactionref,
            status: 'ACTIVE',
            whichaccount: 'PERSONAL',
            currency: transactionData.currency
        };

        const creditTransaction = {
            accountnumber: defaultIncomeAccount,
            userid: 0,
            description: transactionData.description + ' Credit',
            debit: 0,
            credit: adjustedAmount,
            ttype: "CREDIT",
            tfrom: 'BANK',
            createdby: 0,
            valuedate: new Date(),
            reference: creditReference,
            transactiondate: new Date(),
            transactiondesc: transactionData.transactiondesc + ' Credit',
            transactionref: transactionData.transactionref,
            status: 'ACTIVE',
            whichaccount: 'INCOME',
            currency: transactionData.currency
        };

        const defaultPersonalDebitTransaction = {
            accountnumber: defaultPersonalAccount,
            userid: 0,
            description: transactionData.description + ' Default Personal Account Debit',
            debit: adjustedAmount,
            credit: 0,
            ttype: "DEBIT",
            tfrom: 'BANK',
            createdby: 0,
            valuedate: new Date(),
            reference: defaultPersonalDebitReference,
            transactiondate: new Date(),
            transactiondesc: transactionData.transactiondesc + ' Default Personal Account Debit',
            transactionref: transactionData.transactionref,
            status: 'ACTIVE',
            whichaccount: 'PERSONAL',
            currency: transactionData.currency
        };

        // Save transactions directly to the transaction table
        const saveTransactionQuery = {
            text: `INSERT INTO divine."transaction" (accountnumber, userid, description, debit, credit, ttype, tfrom, createdby, valuedate, reference, transactiondate, transactiondesc, transactionref, status, whichaccount, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            values: [
                debitTransaction.accountnumber,
                debitTransaction.userid,
                debitTransaction.description,
                debitTransaction.debit,
                debitTransaction.credit,
                debitTransaction.ttype,
                debitTransaction.tfrom,
                debitTransaction.createdby,
                debitTransaction.valuedate,
                debitTransaction.reference,
                debitTransaction.transactiondate,
                debitTransaction.transactiondesc,
                debitTransaction.transactionref,
                debitTransaction.status,
                debitTransaction.whichaccount,
                debitTransaction.currency
            ]
        };
        await pg.query(saveTransactionQuery);

        saveTransactionQuery.values = [
            creditTransaction.accountnumber,
            creditTransaction.userid,
            creditTransaction.description,
            creditTransaction.debit,
            creditTransaction.credit,
            creditTransaction.ttype,
            creditTransaction.tfrom,
            creditTransaction.createdby,
            creditTransaction.valuedate,
            creditTransaction.reference,
            creditTransaction.transactiondate,
            creditTransaction.transactiondesc,
            creditTransaction.transactionref,
            creditTransaction.status,
            creditTransaction.whichaccount,
            creditTransaction.currency
        ];
        await pg.query(saveTransactionQuery);

        saveTransactionQuery.values = [
            defaultPersonalDebitTransaction.accountnumber,
            defaultPersonalDebitTransaction.userid,
            defaultPersonalDebitTransaction.description,
            defaultPersonalDebitTransaction.debit,
            defaultPersonalDebitTransaction.credit,
            defaultPersonalDebitTransaction.ttype,
            defaultPersonalDebitTransaction.tfrom,
            defaultPersonalDebitTransaction.createdby,
            defaultPersonalDebitTransaction.valuedate,
            defaultPersonalDebitTransaction.reference,
            defaultPersonalDebitTransaction.transactiondate,
            defaultPersonalDebitTransaction.transactiondesc,
            defaultPersonalDebitTransaction.transactionref,
            defaultPersonalDebitTransaction.status,
            defaultPersonalDebitTransaction.whichaccount,
            defaultPersonalDebitTransaction.currency
        ];
        await pg.query(saveTransactionQuery);

        schedule.scheduleJob("0 0 * * *", async () => {
            try {
                console.log('Sending notification of the charges...');
                // Logic to send notification
            } catch (error) {
                console.error('Error in scheduled job:', error);
            }
        });

        return { status: true, message: 'Interbank income transaction completed successfully.' };
    } catch (error) {
        console.error(error.message);
        return { status: false, message: error.message };
    }
}


// FOR TESTING
function getTransactionx(from, to) {
   // Define the 'from' transaction
const fromTransaction = {
    accountnumber: "1000000001",
    credit: 0,
    debit: 5000,
    reference: "",
    transactiondate: new Date(),
    transactiondesc: 'Payment for services',
    currency: 'NGN',
    description: 'Payment reference',
    branch: 'Main',
    registrationpoint: 'Online',
    ttype: 'DEBIT', // Original transaction type
    tfrom: 'BANK',
    tax: false,
};

// Define the 'to' transaction
const toTransaction = {
    accountnumber: "1090000001",
    credit: 5000,
    debit: 0,
    reference: "",
    transactiondate: new Date(),
    transactiondesc: 'Received payment',
    currency: 'NGN',
    description: '',
    branch: 'Main',
    registrationpoint: 'Online',
    ttype: 'CREDIT',
    tfrom: 'BANK',
    tax: false,
};

// Perform the transaction
performTransaction(fromTransaction, toTransaction)
    .then(result => {
        console.log('Transaction Result:', result ? 'Success' : 'Failure', result);
    })
    .catch(err => {
        console.error('Transaction Failed:', err);
    });

}

module.exports = { performTransaction, getTransactionx, performTransactionOneWay, interbankIncome }