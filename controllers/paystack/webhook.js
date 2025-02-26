const { StatusCodes } = require("http-status-codes");
const { sendEmail } = require("../../utils/sendEmail");
const pg = require("../../db/pg");
const { performTransactionOneWay } = require("../../middleware/transactions/performTransaction");

const paystackWebhook = async (req, res) => {
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

        // Send the event and its details to jovisamblue@gmail.com
        const emailSubject = `New Paystack Event: ${event.event}`;
        const emailBody = `
            <h1>Paystack Event Received</h1>
            <p>Event Type: ${event.event}</p>
            <pre>${JSON.stringify(event, null, 2)}</pre>
        `;
        await sendEmail({ to: 'jovisamblue@gmail.com', subject: emailSubject, text: '', html: emailBody });

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
    const bankTransaction = {
        accountnumber: transactionData.authorization.receiver_bank_account_number,
        userid: transactionData.customer.id,
        description: transactionData.authorization.narration,
        debit: 0,
        credit: transactionData.amount, // Assuming it's a debit transaction
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
        rawdata: JSON.stringify(transactionData)
    };

    const query = {
        text: `INSERT INTO banktransaction(
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

    const orgSettingsQuery = {
        text: `SELECT personal_account_prefix FROM divine."Organisationsettings" LIMIT 1`,
        values: []
    };

    const { rows } = await pg.query(orgSettingsQuery);
    const personalAccountPrefix = rows[0].personal_account_prefix;

    const oneWayTransaction = {
        accountnumber: `${personalAccountPrefix}${transactionData.customer.phone}`,
        userid: 0,
        description: bankTransaction.description,
        debit: bankTransaction.debit,
        credit: bankTransaction.credit,
        transactiontype: 'CREDIT',
        transactionfrom: 'BANK',
        createdby: 0,
        valuedate: bankTransaction.valuedate,
        reference: bankTransaction.reference,
        transactiondate: bankTransaction.transactiondate,
        transactiondescription: bankTransaction.transactiondesc,
        transactionreference: bankTransaction.transactionref,
        status: bankTransaction.status,
        whichaccount: 'PERSONNAL'
    };

    await performTransactionOneWay(oneWayTransaction);

    await pg.query(query);
};

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

const handleRefundProcessed = async (data) => {
    console.log('Handling refund.processed:', data);
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
// {
//     "event": "charge.success",
//     "data": {
//       "id": 302961,
//       "domain": "live",
//       "status": "success",
//       "reference": "qTPrJoy9Bx",
//       "amount": 10000,
//       "message": null,
//       "gateway_response": "Approved by Financial Institution",
//       "paid_at": "2016-09-30T21:10:19.000Z",
//       "created_at": "2016-09-30T21:09:56.000Z",
//       "channel": "card",
//       "currency": "NGN",
//       "ip_address": "41.242.49.37",
//       "metadata": 0,
//       "log": {
//         "time_spent": 16,
//         "attempts": 1,
//         "authentication": "pin",
//         "errors": 0,
//         "success": false,
//         "mobile": false,
//         "input": [],
//         "channel": null,
//         "history": [
//           {
//             "type": "input",
//             "message": "Filled these fields: card number, card expiry, card cvv",
//             "time": 15
//           },
//           {
//             "type": "action",
//             "message": "Attempted to pay",
//             "time": 15
//           },
//           {
//             "type": "auth",
//             "message": "Authentication Required: pin",
//             "time": 16
//           }
//         ]
//       },
//       "fees": null,
//       "customer": {
//         "id": 68324,
//         "first_name": "BoJack",
//         "last_name": "Horseman",
//         "email": "bojack@horseman.com",
//         "customer_code": "CUS_qo38as2hpsgk2r0",
//         "phone": null,
//         "metadata": null,
//         "risk_action": "default"
//       },
//       "authorization": {
//         "authorization_code": "AUTH_f5rnfq9p",
//         "bin": "539999",
//         "last4": "8877",
//         "exp_month": "08",
//         "exp_year": "2020",
//         "card_type": "mastercard DEBIT",
//         "bank": "Guaranty Trust Bank",
//         "country_code": "NG",
//         "brand": "mastercard",
//         "account_name": "BoJack Horseman"
//       },
//       "plan": {}
//     }
//   }