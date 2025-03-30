const { StatusCodes } = require("http-status-codes");
const { sendEmail } = require("../../utils/sendEmail");
const pg = require("../../db/pg");
const { performTransactionOneWay } = require("../../middleware/transactions/performTransaction");

const paystackWebhook = async (req, res) => {
    console.log('here called')

    await sendEmail({ to: 'divinehelpfarmers@gmail.com', subject: 'Paystack Event', text: '', html: JSON.stringify(req.body, null, 2) });

    try {
        const event = req.body;

        // Log the received event
        console.log('Received Paystack Event:', event);

        switch (event.event) {
            case "charge.success":
                await handleChargeSuccess(event.data);
                break;
            case "transfer.reversed":
                await handleTransferReversed(event.data);
                break;
            case "transfer.failed":
                await handleTransferFailed(event.data);
                break;
            case "transfer.success":
                await handleTransferSuccess(event.data);
                break;
            case "refund.processing":
                await handleRefundProcessing(event.data);
                break;
            case "refund.processed": 
                await handleRefundProcessed(event.data);
                break;
            case "refund.pending":
                await handleRefundPending(event.data);
                break;
            case "refund.failed":
                await handleRefundFailed(event.data);
                break;
            case "paymentrequest.success":
                await handlePaymentRequestSuccess(event.data);
                break;
            case "paymentrequest.pending":
                await handlePaymentRequestPending(event.data);
                break;
            default:
                console.log(`Unhandled event type: ${event.event}`);
                break;
        }

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Event received successfully",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) {
        console.error('Error processing Paystack event:', error);

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An error occurred while processing the event",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

const handleChargeSuccess = async (transactionData) => {
    // Check if the transaction reference already exists
    const checkTransactionQuery = {
        text: `SELECT 1 FROM divine."banktransaction" WHERE reference = $1`,
        values: [transactionData.reference]
    };

    const { rows: existingTransaction } = await pg.query(checkTransactionQuery);

    if (existingTransaction.length > 0) {

        const emailOptions = {
            to: 'divinehelpfarmers@gmail.com',
            subject: 'Duplicate Notification Transaction Error from Paystack',
            text: `Transaction with reference ${transactionData.reference} already exists. This is a duplicate transaction error from Paystack.`
        };

        sendEmail(emailOptions)
            .then(() => console.log('Email sent successfully'))
            .catch(error => console.error('Error sending email:', error));
        return;
    }

    const orgSettingsQuery = {
        text: `SELECT personal_account_prefix FROM divine."Organisationsettings" LIMIT 1`,
        values: []
    };

    const { rows } = await pg.query(orgSettingsQuery);
    const personalAccountPrefix = rows[0].personal_account_prefix;

    console.log(`${personalAccountPrefix}${transactionData.customer.phone}`) 

    const bankTransaction = {
        accountnumber: `${personalAccountPrefix}${transactionData.customer.phone}`,
        userid: 0,
        description: transactionData.authorization.narration,
        debit: 0,
        credit: Math.floor(transactionData.amount / 100), // Remove the last two digits
        ttype: "CREDIT", // Assuming the type is DEPOSIT
        tfrom: transactionData.authorization.sender_bank,
        createdby: 0, // Assuming system created
        valuedate: new Date(transactionData.paid_at),
        reference: transactionData.reference,
        transactiondate: new Date(transactionData.created_at),
        transactiondesc: transactionData.authorization.narration,
        transactionref: transactionData.reference,
        status: 'ACTIVE',
        whichaccount: transactionData.authorization.receiver_bank,
        currency: transactionData.currency, // Added currency
        rawdata: JSON.stringify(transactionData)
    };

    const checkReferenceQuery = {
        text: `SELECT accountnumber, userid FROM divine."paystackreferences" WHERE reference = $1`,
        values: [transactionData.reference]
    };

    const { rows: referenceRows } = await pg.query(checkReferenceQuery);

    if (referenceRows.length > 0) {
        bankTransaction.accountnumber = referenceRows[0].accountnumber;
        bankTransaction.userid = referenceRows[0].userid;
    } else {
        bankTransaction.description += ' - Account number not booked, redirected to depositor\'s personal account';
    }

    const query = {
        text: `INSERT INTO divine."banktransaction" (
            accountnumber, userid, description, debit, credit, ttype, tfrom, createdby, valuedate, reference, transactiondate, transactiondesc, transactionref, status, whichaccount, rawdata
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        values: [
            bankTransaction.accountnumber,
            bankTransaction.userid,
            bankTransaction.description,
            bankTransaction.debit,
            bankTransaction.credit,
            bankTransaction.ttype,
            bankTransaction.tfrom,
            bankTransaction.createdby,
            bankTransaction.valuedate,
            bankTransaction.reference,
            bankTransaction.transactiondate,
            bankTransaction.transactiondesc,
            bankTransaction.transactionref,
            bankTransaction.status,
            bankTransaction.whichaccount,
            bankTransaction.rawdata
        ]
    };

    await pg.query(query);

    const oneWayTransaction = {
        accountnumber: bankTransaction.accountnumber,
        userid: 0,
        debit: bankTransaction.debit,
        credit: bankTransaction.credit,
        transactiontype: 'CREDIT',
        transactionfrom: 'BANK',
        createdby: 0,
        valuedate: bankTransaction.valuedate,
        reference: bankTransaction.reference,
        transactiondate: bankTransaction.transactiondate,
        transactiondescription: `Sent from ${transactionData.authorization.bank} by ${transactionData.authorization.account_name ?? transactionData.authorization.sender_name}`,
        transactionreference: bankTransaction.transactionref,
        status: bankTransaction.status,
        whichaccount: 'PERSONNAL',
        currency: bankTransaction.currency, // Added currency
        description: `Sent from ${transactionData.authorization.bank} by ${transactionData.authorization.account_name ?? transactionData.authorization.sender_name}`
    };

    await performTransactionOneWay(oneWayTransaction);

    // Send a credit alert email
    const sendCreditAlertEmail = async (accountNumber, creditAmount, balance) => {
        const emailSubject = 'Credit Alert from DIVINE HELP FARMERS';
        const emailBody = `
            <h1>Credit Alert</h1>
            <p>Your account ${accountNumber} has been credited with ₦${creditAmount.toLocaleString('en-US')}.</p>
            <p>Source: Sent from ${transactionData.authorization.bank} by ${transactionData.authorization.account_name ?? transactionData.authorization.sender_name}.</p>
            <p>Transaction Time: ${new Date().toLocaleString()}</p>
            <p>Transaction Status: Successful</p>
            <p>Available Balance: ₦${balance.toLocaleString('en-US')}</p>
            <p>Thank you for banking with DIVINE HELP FARMERS.</p>
        `;
        await sendEmail({ to: `${transactionData.customer.email}`, subject: emailSubject, text: '', html: emailBody });
    };

    // Send a transaction notification email to divinehelpfarmers@gmail.com
    const sendTransactionNotificationEmail = async (accountNumber, creditAmount, phone) => {
        // Fetch user's first and last name from the user table
        const userQuery = {
            text: `SELECT firstname, lastname, id FROM divine."User" WHERE phone = $1`,
            values: [phone]
        };
        const { rows: [usere] } = await pg.query(userQuery);

        const emailSubject = 'Transaction Notification';
        const emailBody = `
            <h1>Transaction Alert</h1>
            <p>Account ${accountNumber} (${usere.firstname} ${usere.lastname}) has performed a transaction.</p>
            <p>Amount Credited: ₦${creditAmount.toLocaleString('en-US')}</p>
            <p>Source: Sent from ${transactionData.authorization.bank} by ${transactionData.authorization.account_name ?? transactionData.authorization.sender_name}.</p>
            <p>Transaction Time: ${new Date().toLocaleString()}</p>
        `;
        await sendEmail({ to: 'divinehelpfarmers@gmail.com', subject: emailSubject, text: '', html: emailBody });
    };

    // Send a notification to the user
    const sendUserNotification = async (userId, title, description) => {
        const notificationQuery = {
            text: `INSERT INTO divine."notification" (userid, title, description, location) VALUES ($1, $2, $3, $4)`,
            values: [userId, title, description, 'dashboard']
        };
        await pg.query(notificationQuery);
    };

    // Calculate the balance from the transaction table
    const calculateBalance = async (accountNumber) => { 
        const balanceQuery = {
            text: `SELECT SUM(credit) - SUM(debit) AS balance FROM divine."transaction" WHERE accountnumber = $1`,
            values: [accountNumber]
        };
        const { rows } = await pg.query(balanceQuery);
        return rows[0].balance;
    };

    // Execute the functions
    const accountNumber = `${personalAccountPrefix}${transactionData.customer.phone}`;
    const creditAmount = bankTransaction.credit;

    const balance = await calculateBalance(accountNumber);
    await sendCreditAlertEmail(accountNumber, creditAmount, balance);
    await sendTransactionNotificationEmail(accountNumber, creditAmount, transactionData.customer.phone);
    // await sendUserNotification(bankTransaction.userid, 'Credit Alert', `Your account has been credited with ₦${creditAmount.toLocaleString('en-US')}.`);

    // Create a notification for the user
    const userNotificationTitle = 'Transaction Successful';
    const userNotificationDescription = `Your account ${accountNumber} has been credited with ₦${creditAmount.toLocaleString('en-US')}.`;
    await sendUserNotification(usere.id, userNotificationTitle, userNotificationDescription);

    console.log(`The balance for account ${accountNumber} is ${balance}`);
}

// Placeholder functions for other event types 
const handleTransferReversed = async (data) => {
    console.log('Handling transfer.reversed:', data);

    const { amount, currency, reason, reference, recipient } = data;
    const { account_number, bank_name } = recipient.details;

    // Log the details of the reversed transfer
    console.log(`Transfer of ${currency} ${amount} to account ${account_number} at ${bank_name} has been reversed.`);
    console.log(`Reason for reversal: ${reason}`);
    console.log(`Reference: ${reference}`);

    try {
        // Fetch the transaction using the reference
        const transactionQuery = {
            text: `SELECT * FROM divine."transaction" WHERE transactiondesc LIKE $1`,
            values: [`%||${reference}`]
        };
        const { rows: [transaction] } = await pg.query(transactionQuery);

        if (!transaction) {
            console.error(`No transaction found with reference: ${reference}`);
            return;
        }

        // Clone the transaction and create a reversed bank transaction
        const bankTransaction = {
            ...transaction,
            credit: transaction.debit,
            debit: 0,
            transactiondesc: `Reversed: ${transaction.transactiondesc}`,
            transactiondate: new Date(),
            status: 'ACTIVE'
        };

        // Insert the reversed bank transaction into both 'transaction' and 'banktransaction' tables
        const insertTransactionQuery = {
            text: `INSERT INTO divine."transaction" (accountnumber, userid, description, debit, credit, ttype, tfrom, createdby, valuedate, reference, transactiondate, transactiondesc, transactionref, status, whichaccount, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            values: [
                bankTransaction.accountnumber,
                bankTransaction.userid,
                bankTransaction.description,
                bankTransaction.debit,
                bankTransaction.credit,
                bankTransaction.ttype,
                bankTransaction.tfrom,
                bankTransaction.createdby,
                bankTransaction.valuedate,
                bankTransaction.reference,
                bankTransaction.transactiondate,
                bankTransaction.transactiondesc,
                bankTransaction.transactionref,
                bankTransaction.status,
                bankTransaction.whichaccount,
                bankTransaction.currency
            ]
        };

        const insertBankTransactionQuery = {
            text: `INSERT INTO divine."banktransaction" (accountnumber, userid, description, debit, credit, ttype, tfrom, createdby, valuedate, reference, transactiondate, transactiondesc, transactionref, status, whichaccount, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            values: [
                bankTransaction.accountnumber,
                bankTransaction.userid,
                bankTransaction.description,
                bankTransaction.debit,
                bankTransaction.credit,
                bankTransaction.ttype,
                bankTransaction.tfrom,
                bankTransaction.createdby,
                bankTransaction.valuedate,
                bankTransaction.reference,
                bankTransaction.transactiondate,
                bankTransaction.transactiondesc,
                bankTransaction.transactionref,
                bankTransaction.status,
                bankTransaction.whichaccount,
                bankTransaction.currency
            ]
        };

        await pg.query(insertTransactionQuery);
        await pg.query(insertBankTransactionQuery);
        console.log(`Reversed transaction for reference ${reference} has been recorded in both transaction and banktransaction tables.`);
    } catch (error) {
        console.error('Error processing reversed transaction:', error);
    }
};
 
const handleTransferFailed = async (data) => {
    console.log('Handling transfer.failed:', data);

    const { amount, currency, reason, reference, recipient } = data;
    const { account_number, bank_name } = recipient.details;

    // Log the details of the failed transfer
    console.log(`Transfer of ${currency} ${amount} to account ${account_number} at ${bank_name} has failed.`);
    console.log(`Reason for failure: ${reason}`);
    console.log(`Reference: ${reference}`);

    try {
        // Fetch the transaction using the reference
        const transactionQuery = {
            text: `SELECT * FROM divine."transaction" WHERE transactiondesc LIKE $1`,
            values: [`%||${reference}`]
        };
        const { rows: [transaction] } = await pg.query(transactionQuery);

        if (!transaction) {
            console.error(`No transaction found with reference: ${reference}`);
            return;
        }

        // Clone the transaction and create a new transaction crediting it
        const creditTransaction = {
            ...transaction,
            debit: 0,
            credit: transaction.debit,
            transactiondesc: `Credit for failed transfer: ${transaction.transactiondesc}`,
            transactiondate: new Date(),
            status: 'ACTIVE'
        };

        // Insert the new credit transaction
        const insertTransactionQuery = {
            text: `INSERT INTO divine."transaction" (accountnumber, userid, description, debit, credit, ttype, tfrom, createdby, valuedate, reference, transactiondate, transactiondesc, transactionref, status, whichaccount, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            values: [
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
            ]
        };

        await pg.query(insertTransactionQuery);
        console.log(`Credit transaction for failed transfer with reference ${reference} has been recorded.`);
    } catch (error) {
        console.error('Error processing failed transfer:', error);
    }
};

const handleTransferSuccess = async (data) => {
    console.log('Handling transfer.success:', data);

    try {
        // Notify the user of the successful transfer
        const notificationMessage = `Transfer of ${data.amount / 100} ${data.currency} to ${data.recipient.details.account_number} was successful.`;
        await sendNotification(data.recipient.email, notificationMessage);

        // Send an email to the user
        const emailSubject = 'Transfer Successful';
        const emailBody = `
            <p>Dear ${data.recipient.name},</p>
            <p>Your transfer of ${data.amount / 100} ${data.currency} to account number ${data.recipient.details.account_number} at ${data.recipient.details.bank_name} was successful.</p>
            <p>Reference: ${data.reference}</p>
            <p>Reason: ${data.reason}</p>
            <p>Thank you for using our service.</p>
        `;
        await sendEmail(data.recipient.email, emailSubject, emailBody);

        console.log('Notification and email sent successfully for transfer:', data.reference);
    } catch (error) {
        console.error('Error handling transfer.success:', error);
    }
};

const handleRefundProcessing = async (data) => {
    console.log('Handling refund.processing:', data);
};

/**
 * Rewritten code snippet for handleRefundProcessed
 */

// Start of Selection
const handleRefundProcessed = async (transactionData) => {
    // 1. Check paystackreferences table with transactionData.transaction_reference
    const paystackRefQuery = {
        text: `SELECT accountnumber, userid, email FROM divine."paystackreferences" WHERE reference = $1 LIMIT 1`,
        values: [transactionData.transaction_reference]
    };
    const { rows: refRows } = await pg.query(paystackRefQuery);

    if (!refRows.length) {
        console.log('No paystack reference found for transaction reference:', transactionData.transaction_reference);
        return;
    }

    const paystackRef = refRows[0];
    const accountNumber = paystackRef.accountnumber;
    const userId = parseInt(paystackRef.userid, 10) || 0;

    // 2. Build the transaction objects
    const bankTransaction = {
        accountnumber: accountNumber,
        userid: userId,
        description: transactionData.merchant_note,
        debit: Math.floor(transactionData.amount / 100), // remove the last two digits
        credit: 0,
        ttype: "DEBIT", // type is REFUND
        tfrom: 'BANK',  // not provided, assume "BANK"
        createdby: 0,   // system created
        valuedate: new Date(),
        reference: transactionData.refund_reference,
        transactiondate: new Date(),
        transactiondesc: transactionData.merchant_note,
        transactionref: transactionData.refund_reference,
        status: 'ACTIVE',
        whichaccount: 'PERSONNAL',
        currency: transactionData.currency,
        rawdata: JSON.stringify(transactionData)
    };

    const query = {
        text: `INSERT INTO divine."banktransaction" (
            accountnumber, userid, description, debit, credit, ttype, tfrom, createdby, valuedate, reference, transactiondate, transactiondesc, transactionref, status, whichaccount, rawdata
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        values: [
            bankTransaction.accountnumber,
            bankTransaction.userid,
            bankTransaction.description,
            bankTransaction.debit,
            bankTransaction.credit,
            bankTransaction.ttype,
            bankTransaction.tfrom,
            bankTransaction.createdby,
            bankTransaction.valuedate,
            bankTransaction.reference,
            bankTransaction.transactiondate,
            bankTransaction.transactiondesc,
            bankTransaction.transactionref,
            bankTransaction.status,
            bankTransaction.whichaccount,
            bankTransaction.rawdata
        ]
    };

    const oneWayTransaction = {
        accountnumber: accountNumber,
        userid: userId,
        debit: bankTransaction.debit,
        credit: bankTransaction.credit,
        transactiontype: 'DEBIT',
        transactionfrom: 'BANK',
        createdby: 0,
        valuedate: bankTransaction.valuedate,
        reference: bankTransaction.reference,
        transactiondate: bankTransaction.transactiondate,
        transactiondescription: transactionData.merchant_note,
        transactionreference: bankTransaction.transactionref,
        status: bankTransaction.status,
        whichaccount: 'PERSONNAL',
        currency: bankTransaction.currency,
        description: transactionData.merchant_note
    };

    await performTransactionOneWay(oneWayTransaction);
    await pg.query(query);

    // 3. Helper functions
    const sendRefundAlertEmail = async (accountNumber, debitAmount, balance) => {
        const emailSubject = 'Refund Alert from DIVINE HELP FARMERS';
        const emailBody = `
            <h1>Refund Alert</h1>
            <p>Your account ${accountNumber} has been debited with ₦${debitAmount.toLocaleString('en-US')} for a refund.</p>
            <p>Source: ${transactionData.merchant_note}.</p>
            <p>Transaction Time: ${new Date().toLocaleString()}</p>
            <p>Transaction Status: Successful</p>
            <p>Available Balance: ₦${balance.toLocaleString('en-US')}</p>
            <p>Thank you for banking with DIVINE HELP FARMERS.</p>
        `;
        await sendEmail({ to: transactionData.customer.email, subject: emailSubject, text: '', html: emailBody });
    };

    const calculateBalance = async (acctNumber) => {
        const balanceQuery = {
            text: `SELECT SUM(credit) - SUM(debit) AS balance FROM divine."transaction" WHERE accountnumber = $1`,
            values: [acctNumber]
        };
        const { rows } = await pg.query(balanceQuery);
        return rows[0].balance;
    };

    // 4. Perform final tasks
    const debitAmount = bankTransaction.debit;
    const balance = await calculateBalance(accountNumber);
    await sendRefundAlertEmail(accountNumber, debitAmount, balance);

    console.log(`The balance for account ${accountNumber} after refund is ${balance}`);
};

const handleRefundPending = async (data) => {
    console.log('Handling refund.pending:', data);
};

const handleRefundFailed = async (data) => {
    console.log('Handling refund.failed:', data);
};

const handlePaymentRequestSuccess = async (data) => {
    console.log('Handling paymentrequest.success:', data);
};

const handlePaymentRequestPending = async (data) => {
    console.log('Handling paymentrequest.pending:', data);
};

module.exports = { paystackWebhook };
