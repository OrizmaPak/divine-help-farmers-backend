const { activityMiddleware } = require("../activity");
const saveTransactionMiddleware = require("./transaction");

async function performTransaction(from, to) {
    const res = {
        status: (code) => ({
            json: (data) => console.log('Response:', code, data) 
        })
    };

    try {
        // Log the transaction attempt in the activity
        await activityMiddleware(from, 0, 'Attempting to perform transaction', 'TRANSACTION');

        let fromReference = null;
        await saveTransactionMiddleware(from, res, () => {
            fromReference = from.body.reference;
            console.log('From middleware reference:', fromReference);
        });

        if (!fromReference) {
            return false;
        }

        to.body.reference = fromReference;

        let toReference = null;
        await saveTransactionMiddleware(to, res, () => {
            toReference = to.body.reference;
            console.log('To middleware reference:', toReference);
        });

        if (!toReference) {
            // Reverse the transaction if the 'to' instance fails
            if (from.body.debit > 0) {
                from.body.credit = from.body.debit;
                from.body.debit = 0;
            } else if (from.body.credit > 0) {
                from.body.debit = from.body.credit;
                from.body.credit = 0;
            }
            await saveTransactionMiddleware(from, res, () => {
                console.log('Reversed transaction for from instance');
            });
            return false;
        }

        // Log the successful transaction in the activity
        await activityMiddleware(from, 0, 'Transaction performed successfully', 'TRANSACTION');
        return true;

    } catch (error) {
        console.error('Error performing transaction:', error);

        // Log the error in the activity
        await activityMiddleware(from, 0, 'Error performing transaction', 'TRANSACTION');
        return false;
    }
}


module.exports = { performTransaction }