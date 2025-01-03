const { saveTransaction } = require("../../../utils/transactionHelper");


async function personalCredit(client, req, res, next, accountnumber, credit, description, ttype, transactionStatus, whichaccount) {
    if (credit > 0) {
        await saveTransaction(client, res, {
            accountnumber: req.body.personalaccountnumber,
            credit,
            debit: 0, // Assuming debit is 0 for credit transactions
            description,
            ttype,
            status: transactionStatus,
            whichaccount
        }, req);
        req.body.transactiondesc += `An amount of ${req.body.currency} ${credit} has been successfully credited to the personal account.|`;
        await client.query('COMMIT'); // Commit the transaction
        await activityMiddleware(req, req.user.id, 'Transaction saved successfully', 'TRANSACTION'); // Log activity
    }
}

module.exports = {
    personalCredit
};
