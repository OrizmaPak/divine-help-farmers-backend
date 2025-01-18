
const viewCollectionsForTheDay = async (req, res) => {
    const user = req.user;
    const { date } = req.query;

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
        const transactionsQuery = `
            SELECT 
                t.userid, 
                u.branch, 
                t.accountnumber, 
                u.firstname, 
                u.lastname, 
                u.othernames, 
                t.ttype, 
                t.tfrom, 
                t.credit, 
                t.debit, 
                t.description
            FROM 
                divine."transaction" t
            JOIN 
                divine."User" u ON t.userid = u.id
            WHERE 
                t.transactiondate >= $1 
                AND t.transactiondate <= $2
                AND t.status = 'ACTIVE'
                AND t.ttype IN ('CREDIT', 'DEBIT')
        `;

        const { rows: transactions } = await pg.query(transactionsQuery, [startOfDay.toISOString(), endOfDay.toISOString()]);

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

        transactions.forEach(tx => {
            const userId = tx.userid;
            if (!userCollections[userId]) {
                userCollections[userId] = {
                    userid: userId,
                    fullname: `${tx.firstname} ${tx.lastname} ${tx.othernames || ''}`,
                    branch: tx.branch,
                    amountCollected: 0,
                    paid: 0,
                    penalty: 0,
                    excess: 0,
                    balance: 0,
                    transactions: []
                };
            }

            const user = userCollections[userId];

            if (tx.ttype === 'CREDIT') {
                user.amountCollected += tx.credit || 0;
            }

            if (tx.ttype === 'DEBIT') {
                user.paid += tx.debit || 0;
            }

            // Assuming penalty is indicated in description
            if (tx.description && tx.description.toLowerCase().includes('penalty')) {
                user.penalty += tx.debit || 0;
            }

            // Add transaction details
            user.transactions.push({
                accountnumber: tx.accountnumber,
                accountname: user.fullname || 'N/A', // Assuming accountname is same as fullname
                accounttype: getAccountType(tx.accountnumber), // Function to determine account type
                tfrom: tx.tfrom,
                credit: tx.credit || 0
            });
        });

        // Calculate excess and balance for each user
        Object.values(userCollections).forEach(user => {
            const net = user.amountCollected - user.paid;
            if (net > 0) {
                user.balance = net;
            } else {
                user.excess = Math.abs(net);
            }
        });

        // Function to determine account type based on account number
        const getAccountType = (accountNumber) => {
            const savingsPrefix = 'SAV'; // Example prefix
            const loanPrefix = 'LN'; // Example prefix
            const personalPrefix = 'PR'; // Example prefix

            if (accountNumber.startsWith(savingsPrefix)) {
                return 'Savings';
            } else if (accountNumber.startsWith(loanPrefix)) {
                return 'Loan';
            } else if (accountNumber.startsWith(personalPrefix)) {
                return 'Personal';
            } else {
                return 'Unknown';
            }
        };

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


