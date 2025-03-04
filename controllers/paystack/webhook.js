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
        accountnumber: `${personalAccountPrefix}${transactionData.customer.phone}`,
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
    await pg.query(query);

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
            text: `SELECT firstname, lastname FROM divine."User" WHERE phone = $1`,
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
    await sendUserNotification(bankTransaction.userid, 'Credit Alert', `Your account has been credited with ₦${creditAmount.toLocaleString('en-US')}.`);

    console.log(`The balance for account ${accountNumber} is ${balance}`);
}

// Placeholder functions for other event types 
const handleTransferReversed = async (data) => {
    console.log('Handling transfer.reversed:', data);
};
 
const handleTransferFailed = async (data) => {
    console.log('Handling transfer.failed:', data); 
};

const handleTransferSuccess = async (data) => {
    console.log('Handling transfer.success:', data);
};

const handleRefundProcessing = async (data) => {
    console.log('Handling refund.processing:', data);
};

const handleRefundProcessed = async (transactionData) => {
    const orgSettingsQuery = {
        text: `SELECT personal_account_prefix FROM divine."Organisationsettings" LIMIT 1`,
        values: []
    };

    const { rows: orgRows } = await pg.query(orgSettingsQuery);
    const personalAccountPrefix = orgRows[0].personal_account_prefix;

    // Fetch user details using the email
    const userQuery = {
        text: `SELECT id, phone FROM divine."User" WHERE email = $1 LIMIT 1`,
        values: [transactionData.customer.email]
    };

    const { rows: userRows } = await pg.query(userQuery);
    const user = userRows[0];
    const userId = user.id;
    const userPhone = user.phone;

    const bankTransaction = {
        accountnumber: `${personalAccountPrefix}${userPhone}`,
        userid: userId,
        description: transactionData.merchant_note,
        debit: Math.floor(transactionData.amount / 100), // Remove the last two digits
        credit: 0,
        ttype: "DEBIT", // Assuming the type is REFUND
        tfrom: 'BANK', // Assuming the sender bank is not provided
        createdby: 0, // Assuming system created
        valuedate: new Date(), // Assuming current date as valuedate
        reference: transactionData.refund_reference,
        transactiondate: new Date(), // Assuming current date as transactiondate
        transactiondesc: transactionData.merchant_note,
        transactionref: transactionData.refund_reference,
        status: 'ACTIVE',
        whichaccount: 'PERSONNAL',
        currency: transactionData.currency, // Added currency
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
        accountnumber: `${personalAccountPrefix}${userPhone}`,
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
        currency: bankTransaction.currency, // Added currency
        description: transactionData.merchant_note
    };

    await performTransactionOneWay(oneWayTransaction);
    await pg.query(query);

    // Send a refund alert email
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
        await sendEmail({ to: `${transactionData.customer.email}`, subject: emailSubject, text: '', html: emailBody });
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
    const accountNumber = `${personalAccountPrefix}${userPhone}`;
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
