const { activityMiddleware } = require("../activity");
const saveTransactionMiddleware = require("./transaction");

// for performing two way transaction
async function performTransaction(from, to) {
    // Restructure the 'from' and 'to' transactions to include 'user' and 'body'
    const fromTransaction = {
        user: { id: 0 },
        body: { ...from }
    };

    const toTransaction = {
        user: { id: 0 },
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
        await activityMiddleware(fromTransaction, 0, 'Attempting to perform transaction', 'TRANSACTION');

        // Step 2: Save the 'from' transaction
        await saveTransactionMiddleware(fromTransaction, res, () => {
            console.log('From Transaction Reference:', fromTransaction.body.reference);
        });

        // Check if 'from' transaction generated a reference
        if (!fromTransaction.body.reference) {
            console.error('From transaction did not generate a reference.');
            return false;
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

            return false;
        }

        // Step 6: Log the successful transaction in the activity
        await activityMiddleware(fromTransaction, 0, 'Transaction performed successfully', 'TRANSACTION');

        return true;

    } catch (error) {
        console.error('Error performing transaction:', error);

        // Log the error in the activity
        await activityMiddleware(fromTransaction, 0, 'Error performing transaction', 'TRANSACTION_ERROR');

        return false;
    }
}

// for performing one way transaction
async function performTransactionOneWay(transaction) {
    // Restructure the transaction to include 'user' and 'body'
    const transactionData = {
        user: { id: 0 },
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
            return false;
        }

        // Step 3: Log the successful transaction in the activity
        await activityMiddleware(transactionData, 0, 'Transaction performed successfully', 'TRANSACTION');

        return true;

    } catch (error) {
        console.error('Error performing transaction:', error);

        // Log the error in the activity
        await activityMiddleware(transactionData, 0, 'Error performing transaction', 'TRANSACTION_ERROR');

        return false;
    }
}



// FOR TESTING
function getTransactionx(from, to) {
   // Define the 'from' transaction
const fromTransaction = {
    accountnumber: "1000000001",
    credit: 0,
    debit: 5000,
    reference: "987654321234567890098765434567",
    transactiondate: new Date(),
    transactiondesc: 'Payment for services',
    currency: 'NGN',
    description: 'Payment reference',
    branch: 'Main',
    registrationpoint: 'Online',
    ttype: 'CHARGE', // Original transaction type
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

module.exports = { performTransaction, getTransactionx, performTransactionOneWay }