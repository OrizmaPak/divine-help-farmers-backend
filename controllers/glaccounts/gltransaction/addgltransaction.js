const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { generateid } = require("../../../utils/generateid");

const addGLTransaction = async (req, res) => {
    const { creditglrow, debitglrow, customerrow, customertype, bypassbalance="NO" } = req.body;
    let totalCredit = 0;
    let totalDebit = 0;
    req.body.transactionRef = 'GLT-'+generateid();

    try {
        // Calculate total credit amount
        for (let i = 1; i <= creditglrow; i++) {
            const amount = parseFloat(req.body[`cglamount${i}`]);
            totalCredit += amount;
        }

        // Calculate total debit amount
        for (let i = 1; i <= debitglrow; i++) {
            const amount = parseFloat(req.body[`dglamount${i}`]);
            totalDebit += amount;
        }

        // Handle customer accounts if applicable
        const customerQueries = [];
        if (customerrow > 0) {
            for (let i = 1; i <= customerrow; i++) {
                const amount = parseFloat(req.body[`cusamount${i}`]);
                const accountNumber = req.body[`cusaccountnumber${i}`];
                const accounttype = req.body[`accounttype${i}`];

                // Check customer account balance if debiting and bypassbalance is not YES
                if (customertype === 'DEBIT' && bypassbalance !== 'YES') {
                    const { rows: [{ balance }] } = await pg.query(`
                        SELECT SUM(credit) - SUM(debit) AS balance
                        FROM transaction
                        WHERE accountnumber = $1
                    `, [accountNumber]);

                    if (balance < amount) {
                        return res.status(StatusCodes.BAD_REQUEST).json({
                            status: false,
                            message: `Insufficient balance in customer account ${accountNumber}`,
                            statuscode: StatusCodes.BAD_REQUEST,
                            data: null,
                            errors: []
                        });
                    }
                    totalDebit += amount;
                } else if (customertype === 'CREDIT') {
                    totalCredit += amount;
                }
            }
        }

        // Ensure credits and debits balance
        if (totalCredit !== totalDebit) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Credits and debits do not balance",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Check debit account balances if bypassbalance is not YES
        if (bypassbalance !== 'YES') {
            for (let i = 1; i <= debitglrow; i++) {
                const accountNumber = req.body[`dglaccountnumber${i}`];
                const amount = parseFloat(req.body[`dglamount${i}`]);

                const { rows: [{ balance }] } = await pg.query(`
                    SELECT SUM(credit) - SUM(debit) AS balance
                    FROM transaction
                    WHERE accountnumber = $1
                `, [accountNumber]);

                if (balance < amount) {
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        status: false,
                        message: `Insufficient balance in account ${accountNumber}`,
                        statuscode: StatusCodes.BAD_REQUEST,
                        data: null,
                        errors: []
                    });
                }
            }
        }

        // Create transactions
        const queries = [];

        // Credit transactions
        for (let i = 1; i <= creditglrow; i++) {
            const accountNumber = req.body[`cglaccountnumber${i}`];
            const amount = parseFloat(req.body[`cglamount${i}`]);
            const reference = await generateNewReference(pg, accountNumber, req);

            queries.push(pg.query(`
                INSERT INTO transaction (accountnumber, credit, transactionref, dateadded, status, userid, currency, description, image, branch, registrationpoint, approvedby, updateddated, transactiondate, transactiondesc, cashref, updatedby, ttype, tfrom, createdby, valuedate, reference, whichaccount, voucher, tax)
                VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            `, [
                accountNumber, 
                amount, 
                req.body.transactionref || null, 
                'ACTIVE', 
                req.body.userid || null, 
                req.body.currency || null, 
                req.body.description || null, 
                req.body.image || null, 
                req.user.branch || null, 
                req.user.registrationpoint || null, 
                req.body.approvedby || null, 
                req.body.updateddated || null, 
                req.body.transactiondate || new Date(), 
                req.body.transactiondesc || 'System Deduction', 
                req.body.cashref || null, 
                req.body.updatedby || null, 
                'CREDIT', 
                req.body.tfrom || 'BANK', 
                req.user.id || null, 
                req.body.valuedate || new Date(), 
                reference, 
                'GLACCOUNT', 
                req.body.voucher || null, 
                req.body.tax || null
            ]));
        }

        // Debit transactions
        for (let i = 1; i <= debitglrow; i++) {
            const accountNumber = req.body[`dglaccountnumber${i}`];
            const amount = parseFloat(req.body[`dglamount${i}`]);
            const reference = await generateNewReference(pg, accountNumber, req);

            queries.push(pg.query(`
                INSERT INTO transaction (accountnumber, debit, transactionref, dateadded, status, userid, currency, description, image, branch, registrationpoint, approvedby, updateddated, transactiondate, transactiondesc, cashref, updatedby, ttype, tfrom, createdby, valuedate, reference, whichaccount, voucher, tax)
                VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            `, [
                accountNumber, 
                amount, 
                req.body.transactionref || null, 
                'ACTIVE', 
                req.body.userid || null, 
                req.body.currency || null, 
                req.body.description || null, 
                req.body.image || null, 
                req.user.branch || null, 
                req.user.registrationpoint || null, 
                req.body.approvedby || null, 
                req.body.updateddated || null, 
                req.body.transactiondate || new Date(), 
                req.body.transactiondesc || 'System Deduction', 
                req.body.cashref || null, 
                req.body.updatedby || null, 
                'DEBIT', 
                req.body.tfrom || 'BANK', 
                req.user.id || null, 
                req.body.valuedate || new Date(), 
                reference, 
                'GLACCOUNT', 
                req.body.voucher || null, 
                req.body.tax || null
            ]));
        }

        // Save customer transactions after confirming balance
        if (customerrow > 0) {
            for (let i = 1; i <= customerrow; i++) {
                const amount = parseFloat(req.body[`cusamount${i}`]);
                const accountNumber = req.body[`cusaccountnumber${i}`];
                const accounttype = req.body[`accounttype${i}`];
                const reference = await generateNewReference(pg, accountNumber, req);

                if (customertype === 'DEBIT') {
                    customerQueries.push(pg.query(`
                        INSERT INTO transaction (accountnumber, debit, transactionref, dateadded, status, userid, currency, description, image, branch, registrationpoint, approvedby, updateddated, transactiondate, transactiondesc, cashref, updatedby, ttype, tfrom, createdby, valuedate, reference, whichaccount, voucher, tax)
                        VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
                    `, [
                        accountNumber, 
                        amount, 
                        req.body.transactionref || null, 
                        'ACTIVE', 
                        req.body.userid || null, 
                        req.body.currency || null, 
                        req.body.description || null, 
                        req.body.image || null, 
                        req.user.branch || null, 
                        req.user.registrationpoint || null, 
                        req.body.approvedby || null, 
                        req.body.updateddated || null, 
                        req.body.transactiondate || new Date(), 
                        req.body.transactiondesc || 'System Deduction', 
                        req.body.cashref || null, 
                        req.body.updatedby || null, 
                        customertype, 
                        req.body.tfrom || 'BANK', 
                        req.user.id || null, 
                        req.body.valuedate || new Date(), 
                        reference, 
                        accounttype, 
                        req.body.voucher || null, 
                        req.body.tax || null
                    ]));
                } else if (customertype === 'CREDIT') {
                    customerQueries.push(pg.query(`
                        INSERT INTO transaction (accountnumber, credit, transactionref, dateadded, status, userid, currency, description, image, branch, registrationpoint, approvedby, updateddated, transactiondate, transactiondesc, cashref, updatedby, ttype, tfrom, createdby, valuedate, reference, whichaccount, voucher, tax)
                        VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
                    `, [
                        accountNumber, 
                        amount, 
                        req.body.transactionref || null, 
                        'ACTIVE', 
                        req.body.userid || null, 
                        req.body.currency || null, 
                        req.body.description || null, 
                        req.body.image || null, 
                        req.user.branch || null, 
                        req.user.registrationpoint || null, 
                        req.body.approvedby || null, 
                        req.body.updateddated || null, 
                        req.body.transactiondate || new Date(), 
                        req.body.transactiondesc || 'System Deduction', 
                        req.body.cashref || null, 
                        req.body.updatedby || null, 
                        customertype, 
                        req.body.tfrom || 'BANK', 
                        req.user.id || null, 
                        req.body.valuedate || new Date(), 
                        reference, 
                        accounttype, 
                        req.body.voucher || null, 
                        req.body.tax || null
                    ]));
                }
            }
        }

        // Execute all queries including customer transactions
        await Promise.all([...queries, ...customerQueries]);

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Transactions added successfully",
            statuscode: StatusCodes.OK,
            data: { transactionRef },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { addGLTransaction };

