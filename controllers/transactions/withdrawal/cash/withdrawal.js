const { StatusCodes } = require("http-status-codes");
const pg = require("../../../../db/pg");
const { activityMiddleware } = require("../../../../middleware/activity");
const { performTransactionOneWay, performTransaction } = require("../../../../middleware/transactions/performTransaction");

const processWithdrawal = async (req, res) => {
    const { branch, userid, rowsize, location="OUTSIDE" } = req.body;
    const user = req.user;

    if (!branch || !userid || !rowsize) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Branch, user, and rowsize are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    try {
        const { rows: branchData } = await pg.query(`
            SELECT * FROM divine."Branch" WHERE id = $1 AND status = 'ACTIVE'
        `, [branch]);

        if (branchData.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Invalid branch or branch could be inactive",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const { rows: userData } = await pg.query(`
            SELECT * FROM divine."User" WHERE id = $1
        `, [userid]);

        if (userData.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                status: false,
                message: "Invalid user ID",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const { rows: userCheckData } = await pg.query(`
            SELECT * FROM divine."User" WHERE id = $1
        `, [userid]);

        if (userCheckData.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "User not found",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        if (!userCheckData[0].registrationpoint) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "This user is not a marketer",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        if (userCheckData[0].role == 'MEMBER') {
            return res.status(StatusCodes.FORBIDDEN).json({
                status: false,
                message: "Members cannot process transactions",
                statuscode: StatusCodes.FORBIDDEN,
                data: null,
                errors: []
            });
        }

        const { rows: cashierLimitData } = await pg.query(`
            SELECT withdrawallimit FROM divine."Cashierlimit" WHERE cashier = $1 AND status = 'ACTIVE'
        `, [userid]);

        const withdrawalLimit = cashierLimitData[0].withdrawallimit;

        const timestamp = new Date().getTime();
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const cashref = `WD-${year}${month}${day}-${userid}`;

        let failedTransactions = [];

        await pg.query('BEGIN');

        for (let i = 1; i <= rowsize; i++) {
            const accountnumber = req.body[`accountnumber${i}`];
            const debit = req.body[`debit${i}`];

            if (!accountnumber || !debit) {
                await pg.query('ROLLBACK');
                return res.status(StatusCodes.BAD_REQUEST).json({ 
                    status: false,
                    message: `Account number and debit are required for row ${i}`,
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }

            if (Number(debit) > withdrawalLimit) {
                await pg.query('ROLLBACK');
                return res.status(StatusCodes.FORBIDDEN).json({
                    status: false,
                    message: `Transaction amount for row ${i} exceeds the cashier limit of ${withdrawalLimit}. The customer associated with account number ${accountnumber} has already been informed about this issue. Please proceed to refund the customer.`,
                    statuscode: StatusCodes.FORBIDDEN,
                    data: null,
                    errors: []
                });
            }

            const { rows: orgSettingsData } = await pg.query(`
                SELECT default_cash_account FROM divine."Organisationsettings" WHERE status = 'ACTIVE'
            `);

            if (orgSettingsData.length === 0) {
                await pg.query('ROLLBACK');
                return res.status(StatusCodes.NOT_FOUND).json({
                    status: false,
                    message: "Organization settings not found or inactive",
                    statuscode: StatusCodes.NOT_FOUND,
                    data: null,
                    errors: []
                });
            }

            const orgDefaultCashAccount = orgSettingsData[0].default_cash_account;

            // Fetch all transactions for orgDefaultCashAccount
            const { rows: accountTransactions } = await pg.query(`
                SELECT SUM(credit) - SUM(debit) as balance
                FROM divine."transaction"
                WHERE accountnumber = $1 AND branch = $2 AND status = 'ACTIVE'
            `, [orgDefaultCashAccount, branch]);

            const accountBalance = accountTransactions[0].balance || 0;

            // Check if the debit amount exceeds the available balance
            if (Number(debit) > accountBalance) {
                await pg.query('ROLLBACK');
                return res.status(StatusCodes.FORBIDDEN).json({
                    status: false,
                    message: `Insufficient cash balance for your branch. The available balance is ${accountBalance}.`,
                    statuscode: StatusCodes.FORBIDDEN,
                    data: null,
                    errors: []
                });
            }
            
            // Fetch all transactions for orgDefaultCashAccount
            const { rows: accountfromTransactions } = await pg.query(`
                SELECT SUM(credit) - SUM(debit) as balance
                FROM divine."transaction"
                WHERE accountnumber = $1 AND status = 'ACTIVE'
            `, [orgDefaultCashAccount, branch]);

            const accountfromBalance = accountfromTransactions[0].balance || 0;

            // Check if the debit amount exceeds the available balance
            if (Number(debit) > accountfromBalance) {
                await pg.query('ROLLBACK');
                return res.status(StatusCodes.FORBIDDEN).json({
                    status: false,
                    message: `Insufficient balance for ${accountnumber} account. The available balance is ${accountfromBalance}.`,
                    statuscode: StatusCodes.FORBIDDEN,
                    data: null,
                    errors: []
                });
            }

            // if(accountnumber)

            const transactionDetails = {
                debitAccount: {
                    accountnumber,
                    credit: 0,
                    debit: Number(debit),
                    reference: "",
                    transactiondate: new Date(),
                    transactiondesc: (location === 'INSIDE' ? 'BRANCH ' : '') + ' Cash Withdrawal transaction processed by ' + userCheckData[0].firstname + ' ' + userCheckData[0].lastname + ' ' + userCheckData[0].othernames,
                    cashref: cashref,
                    currency: 'NGN',
                    description: (location === 'INSIDE' ? 'BRANCH ' : '') + `Cash Withdrawal of ${debit} from account ${accountnumber}`,
                    branch,
                    registrationpoint: userCheckData[0].registrationpoint,
                    ttype: 'DEBIT', 
                    tfrom: 'CASH',
                    tax: false,
                },
                debitcashAccount: {
                    accountnumber: orgDefaultCashAccount,
                    credit: 0,
                    debit: Number(debit),
                    reference: "",
                    transactiondate: new Date(), 
                    transactiondesc: (location === 'INSIDE' ? 'BRANCH ' : '') + `Cash Withdrawal transaction processed to ${accountnumber} by ` + userCheckData[0].firstname + ' ' + userCheckData[0].lastname + ' ' + userCheckData[0].othernames,
                    cashref: cashref,
                    currency: 'NGN',
                    description: (location === 'INSIDE' ? 'BRANCH ' : '') + `Cash Withdrawal of ${debit} to from cash account to ${accountnumber}`,
                    branch,
                    registrationpoint: userCheckData[0].registrationpoint,
                    ttype: 'DEBIT', 
                    tfrom: 'CASH',
                    tax: false,
                }
            }; 

            const transactionResult = await performTransaction(transactionDetails.debitAccount, transactionDetails.debitcashAccount, userCheckData[0].id);

            const bankTransactionDetails = { 
                accountnumber:orgDefaultCashAccount,
                userid: userCheckData[0].id,
                description: transactionDetails.debitcashAccount.description,
                debit: Number(debit),
                credit: 0,
                ttype: 'WITHDRAWAL',
                tfrom: 'CASH',
                createdby: user.id,
                valuedate: new Date(),
                reference: transactionDetails.debitcashAccount.reference,
                transactiondate: transactionDetails.debitcashAccount.transactiondate,
                transactiondesc: transactionDetails.debitcashAccount.transactiondesc,
                transactionref: cashref,
                status: 'ACTIVE',
                whichaccount: 'CASH',
                rawdata: JSON.stringify(transactionDetails)
            };

            const bankTransactionQuery = {
                text: `INSERT INTO divine."banktransaction" 
                       (accountnumber, userid, description, debit, credit, ttype, tfrom, createdby, valuedate, reference, transactiondate, transactiondesc, transactionref, status, whichaccount, rawdata) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                values: [
                    bankTransactionDetails.accountnumber,
                    bankTransactionDetails.userid,
                    bankTransactionDetails.description,
                    bankTransactionDetails.debit,
                    bankTransactionDetails.credit,
                    bankTransactionDetails.ttype,
                    bankTransactionDetails.tfrom,
                    bankTransactionDetails.createdby,
                    bankTransactionDetails.valuedate,
                    bankTransactionDetails.reference,
                    bankTransactionDetails.transactiondate,
                    bankTransactionDetails.transactiondesc,
                    bankTransactionDetails.transactionref,
                    bankTransactionDetails.status,
                    bankTransactionDetails.whichaccount,
                    bankTransactionDetails.rawdata
                ]
            };

            const orgDebitTransaction = await pg.query(bankTransactionQuery);

            if (!orgDebitTransaction) {
                failedTransactions.push(i);
            }

            if (!transactionResult) {
                failedTransactions.push(i);
            }
        }

        if (failedTransactions.length > 0) {
            await pg.query('ROLLBACK');
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Failed to debit accounts for rows: ${failedTransactions.join(', ')}.`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        await pg.query('COMMIT');
        await activityMiddleware(req, user.id, 'Withdrawals processed successfully', 'TRANSACTION');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Withdrawals processed successfully",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) { 
        await pg.query('ROLLBACK');
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred processing withdrawals', 'TRANSACTION');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { processWithdrawal };
