const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const viewCollectionsForTheDay = async (req, res) => {
    const user = req.user;
    const { date, branch, registrationpoint, userid } = req.query;

    if (!date) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Date is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Missing date"]
        });
    }

    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!dateRegex.test(date)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid date format. Expected YYYY-MM-DD",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid date format"]
        });
    }

    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    try {
        // Fetch transactions for the specified day
        let transactionsQuery = `
            SELECT 
                t.*, 
                u.firstname, 
                u.lastname, 
                u.othernames,
                u.registrationpoint,
                rp.registrationpoint AS registrationpointname,
                b.branch AS branchname
            FROM 
                divine."transaction" t
            JOIN 
                divine."User" u ON t.userid = u.id
            JOIN 
                divine."Branch" b ON u.branch = b.id
            LEFT JOIN 
                divine."Registrationpoint" rp ON u.registrationpoint = rp.id
            WHERE 
                t.transactiondate >= $1 
                AND t.transactiondate <= $2
                AND t.status = 'ACTIVE'
                AND t.ttype IN ('CREDIT', 'DEBIT')
        `;

        const queryParams = [startOfDay.toISOString(), endOfDay.toISOString()];

        // Add branch filter if provided
        if (branch) {
            transactionsQuery += ` AND u.branch = $${queryParams.length + 1}`;
            queryParams.push(branch);
        }

        // Add registration point filter if provided
        if (registrationpoint) {
            transactionsQuery += ` AND u.registrationpoint = $${queryParams.length + 1}`;
            queryParams.push(registrationpoint);
        }

        // Add user ID filter if provided
        if (userid) {
            transactionsQuery += ` AND u.id = $${queryParams.length + 1}`;
            queryParams.push(userid);
        }

        const { rows: transactions } = await pg.query(transactionsQuery, queryParams);

        if (transactions.length === 0) {
            await activityMiddleware(req, user.id, 'No collections found for the specified day', 'VIEW_COLLECTIONS_FOR_THE_DAY');

            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No collections found for the specified day",
                statuscode: StatusCodes.OK,
                data: [],
                errors: []
            });
        }

        // Organize transactions by user
        const userCollections = {};

        for (const tx of transactions) {
            const userId = tx.userid;
            if (!userCollections[userId]) {
                userCollections[userId] = {
                    userid: userId,
                    fullname: `${tx.firstname} ${tx.lastname} ${tx.othernames || ''}`,
                    branchname: tx.branchname,
                    registrationpoint: tx.registrationpoint,
                    registrationpointname: tx.registrationpointname,
                    collected: 0,
                    remitted: 0,
                    penalty: 0,
                    excess: 0,
                    balance: 0,
                    depositcode: tx.cashref,
                    transactions: new Set() // Use a Set to avoid duplicate transactions
                };
            }

            const user = userCollections[userId];

            user.collected += parseInt(tx.credit, 10) + parseInt(tx.debit, 10);

            const transactionRefs = `${tx.cashref}`;
            let remitted = 0;

            const bankTxQuery = `
                SELECT credit, debit FROM divine."banktransaction"
                WHERE transactionref = $1
            `;
            const bankTxResult = await pg.query(bankTxQuery, [transactionRefs]);
            const bankTransactions = bankTxResult.rows;

            const bankTxSum = bankTransactions.reduce((sum, btx) => sum + ((btx.credit || 0) - (btx.debit || 0)), 0);
            remitted = bankTxSum;

            user.remitted += parseInt(remitted, 10) + parseInt(tx.debit || 0, 10);

            // Assuming penalty is indicated in description
            const penaltyRefs = `${tx.cashref}-P`;
            let penaltySum = 0;

            if (penaltyRefs.length > 0) {
                const penaltyQuery = `
                    SELECT debit, credit FROM divine."transaction"
                    WHERE cashref = $1
                `;
                const penaltyResult = await pg.query(penaltyQuery, [penaltyRefs]);
                const penaltyTransactions = penaltyResult.rows;

                penaltySum = penaltyTransactions.reduce((sum, ptx) => sum + ((ptx.debit || 0) - (ptx.credit || 0)), 0);
            }

            user.penalty = parseInt(penaltySum, 10);

            // Add transaction details
            const transactionQuery = `
                SELECT accountnumber, whichaccount, tfrom, credit
                FROM divine."transaction"
                WHERE cashref = $1 AND ttype IN ('CREDIT', 'DEBIT')
            `;
            const transactionResult = await pg.query(transactionQuery, [tx.cashref]);
            const transactionDetails = transactionResult.rows;

            for (let transaction of transactionDetails) {
                let accountName = 'Unknown';
                const { whichaccount, accountnumber } = transaction;

                if (whichaccount === 'PERSONAL') {
                    const { rows: orgSettings } = await pg.query(`SELECT personal_account_prefix FROM divine."Organisationsettings"`);
                    const personalAccountPrefix = orgSettings[0].personal_account_prefix;
                    const phone = accountnumber.replace(personalAccountPrefix, '');
                    const { rows: users } = await pg.query(`SELECT firstname, lastname, othernames FROM divine."User" WHERE phone = $1`, [phone]);
                    if (users.length > 0) {
                        const { firstname, lastname, othernames } = users[0];
                        accountName = `${firstname} ${lastname} ${othernames}`.trim();
                    }
                } else if (whichaccount === 'SAVINGS') {
                    const { rows: savings } = await pg.query(`SELECT userid FROM divine."savings" WHERE accountnumber = $1`, [accountnumber]);
                    if (savings.length > 0) {
                        const { userid } = savings[0];
                        const { rows: users } = await pg.query(`SELECT firstname, lastname, othernames FROM divine."User" WHERE id = $1`, [userid]);
                        if (users.length > 0) {
                            const { firstname, lastname, othernames } = users[0];
                            accountName = `${firstname} ${lastname} ${othernames}`.trim();
                        }
                    }
                } else if (whichaccount === 'LOAN') {
                    const { rows: loans } = await pg.query(`SELECT userid FROM divine."loanaccounts" WHERE accountnumber = $1`, [accountnumber]);
                    if (loans.length > 0) {
                        const { userid } = loans[0];
                        const { rows: users } = await pg.query(`SELECT firstname, lastname, othernames FROM divine."User" WHERE id = $1`, [userid]);
                        if (users.length > 0) {
                            const { firstname, lastname, othernames } = users[0];
                            accountName = `${firstname} ${lastname} ${othernames}`.trim();
                        }
                    }
                } else if (whichaccount === 'GLACCOUNT') {
                    accountName = 'SYSTEM AUTOMATION';
                }

                user.transactions.add(JSON.stringify({
                    accountnumber: transaction.accountnumber,
                    accountname: accountName,
                    accounttype: transaction.whichaccount,
                    tfrom: transaction.tfrom,
                    credit: transaction.credit || 0
                }));
            }
        }

        // Convert Set to Array for transactions
        Object.values(userCollections).forEach(user => {
            user.transactions = Array.from(user.transactions).map(tx => JSON.parse(tx));
        });

        // Calculate excess and balance for each user
        Object.values(userCollections).forEach(user => {
            const net = user.collected - user.remitted;
            if (net > 0) {
                user.balance = net;
            } else {
                user.excess = Math.abs(net);
            }
        });

        await activityMiddleware(req, user.id, 'Collections for the day retrieved successfully', 'VIEW_COLLECTIONS_FOR_THE_DAY');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Collections for the day retrieved successfully",
            statuscode: StatusCodes.OK,
            data: Object.values(userCollections),
            errors: []
        });

    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching collections for the day', 'VIEW_COLLECTIONS_FOR_THE_DAY');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    } 
};

module.exports = { viewCollectionsForTheDay };
