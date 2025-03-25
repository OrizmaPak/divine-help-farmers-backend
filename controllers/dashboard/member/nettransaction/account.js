const { StatusCodes } = require("http-status-codes");
const pg = require("../../../../db/pg");
const { activityMiddleware } = require("../../../../middleware/activity");

const getAccountYearlyTransactions = async (req, res) => {
    const user = req.user;
    const { accountnumber, year } = req.query;

    if (!accountnumber || !year) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Account number and year are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Account number or year not provided"]
        });
    }

    try {
        // Get balance brought forward for the year
        const balanceBroughtForwardQuery = {
            text: `
                SELECT SUM(credit) - SUM(debit) as balance_brought_forward
                FROM divine."transaction"
                WHERE accountnumber = $1 AND EXTRACT(YEAR FROM transactiondate) < $2
            `,
            values: [accountnumber, year]
        };
        const { rows: [{ balance_brought_forward }] } = await pg.query(balanceBroughtForwardQuery);

        // Get monthly credit and debit totals
        const monthlyTransactionsQuery = {
            text: `
                SELECT 
                    EXTRACT(MONTH FROM transactiondate) as month,
                    SUM(credit) as total_credit,
                    SUM(debit) as total_debit
                FROM divine."transaction"
                WHERE accountnumber = $1 AND EXTRACT(YEAR FROM transactiondate) = $2
                GROUP BY month
                ORDER BY month
            `,
            values: [accountnumber, year]
        };
        const { rows: monthlyTransactions } = await pg.query(monthlyTransactionsQuery);

        // Get product name associated with the account number
        const productNameQuery = {
            text: `
                SELECT sp.productname
                FROM divine."savings" s
                JOIN divine."savingsproduct" sp ON s.savingsproductid = sp.id
                WHERE s.accountnumber = $1
            `,
            values: [accountnumber]
        };
        const { rows: [{ productname }] } = await pg.query(productNameQuery);

        // Initialize monthly balances with zero values
        const monthlyBalances = {
            january: { credit: 0, debit: 0, balance: balance_brought_forward || 0 },
            february: { credit: 0, debit: 0, balance: 0 },
            march: { credit: 0, debit: 0, balance: 0 },
            april: { credit: 0, debit: 0, balance: 0 },
            may: { credit: 0, debit: 0, balance: 0 },
            june: { credit: 0, debit: 0, balance: 0 },
            july: { credit: 0, debit: 0, balance: 0 },
            august: { credit: 0, debit: 0, balance: 0 },
            september: { credit: 0, debit: 0, balance: 0 },
            october: { credit: 0, debit: 0, balance: 0 },
            november: { credit: 0, debit: 0, balance: 0 },
            december: { credit: 0, debit: 0, balance: 0 }
        };

        // Calculate balance for each month
        let runningBalance = balance_brought_forward || 0;
        monthlyTransactions.forEach(transaction => {
            const monthNames = [
                "january", "february", "march", "april", "may", "june",
                "july", "august", "september", "october", "november", "december"
            ];
            const monthName = monthNames[transaction.month - 1];
            monthlyBalances[monthName].credit = transaction.total_credit;
            monthlyBalances[monthName].debit = transaction.total_debit;
            runningBalance += transaction.total_credit - transaction.total_debit;
            monthlyBalances[monthName].balance = runningBalance;
        });

        // Calculate final balance for the year
        const finalBalance = runningBalance;

        await activityMiddleware(req, user.id, 'Account yearly transactions fetched successfully', 'TRANSACTION');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Account yearly transactions fetched successfully",
            statuscode: StatusCodes.OK,
            data: {
                balance_brought_forward: balance_brought_forward || 0,
                monthlyBalances,
                final_balance: finalBalance,
                productname
            },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching account yearly transactions', 'TRANSACTION');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getAccountYearlyTransactions };
