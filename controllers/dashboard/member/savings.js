const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { generateText } = require("../../ai/ai");

const getMemberSavings = async (req, res) => {
    if (req.query.userid) {
        const userQuery = {
            text: `SELECT * FROM divine."User" WHERE id = $1`,
            values: [req.query.userid]
        };
        const { rows: [userData] } = await pg.query(userQuery);

        if (!userData) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "User not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: ["User with the provided ID does not exist"]
            });
        }

        req.user = userData;
    }
    const user = req.user;
    if (!req.query.member) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Member ID is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Member ID not provided"]
        });
    }
    const memberId = req.query.member;

    try {
        // Fetch all accounts for the member from the savings table
        const savingsQuery = {
            text: `SELECT accountnumber, savingsproductid FROM divine."savings" WHERE member = $1 AND userid = $2`,            
            values: [memberId, user.id]
        };
        const { rows: accounts } = await pg.query(savingsQuery);

        if (accounts.length === 0) {
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No active savings account found",
                statuscode: StatusCodes.OK,
                data: [],
                errors: []
            });
        }

        // Prepare response data
        const accountDetails = await Promise.all(accounts.map(async (account) => {
            const { accountnumber, savingsproductid } = account;

            // Calculate balance for each account
            const balanceQuery = {
                text: `SELECT SUM(credit) - SUM(debit) as balance FROM divine."transaction" WHERE accountnumber = $1 AND status = 'ACTIVE'`,
                values: [accountnumber]
            };
            const { rows: [{ balance }] } = await pg.query(balanceQuery);

            // Fetch last 10 transactions for each account
            const transactionsQuery = {
                text: `SELECT * FROM divine."transaction" WHERE accountnumber = $1 ORDER BY transactiondate DESC LIMIT 10`,
                values: [accountnumber]
            };
            const { rows: transactions } = await pg.query(transactionsQuery);

            // Fetch product name from savingsproduct table
            const productQuery = {
                text: `SELECT productname FROM divine."savingsproduct" WHERE id = $1`,
                values: [savingsproductid]
            };
            const { rows: [{ productname }] } = await pg.query(productQuery);

            return {
                accountnumber,
                balance: Number(balance),
                transactions,
                productname,
                savingsproductid // Add the product ID to the response
            };
        }));

        // Fetch last 10 transactions across all accounts for the member
        const allTransactionsQuery = {
            text: `SELECT * FROM divine."transaction" WHERE accountnumber = ANY($1::text[]) ORDER BY transactiondate DESC LIMIT 10`,
            values: [accounts.map(account => account.accountnumber)]
        };
        const { rows: allTransactions } = await pg.query(allTransactionsQuery);

        const userFirstName = user.firstname;
        const currentHour = new Date().getHours();
        const greeting = currentHour < 12 ? "Good morning" : "Good afternoon";

        const totalBalance = accountDetails.reduce((sum, account) => sum + account.balance, 0);
        const numberOfAccounts = accountDetails.length;
        const lastTwoTransactions = accountDetails.flatMap(account => account.transactions).slice(0, 2);

        const transactionSummary = lastTwoTransactions.map((transaction, index) => {
            if (transaction) {
                return `Transaction ${index + 1}: ${transaction.description || 'No description'} on ${transaction.transactiondate || 'unknown date'}`;
            }
            return `No transaction available for position ${index + 1}.`;
        }).join(' ');

        const prompt = `
            ${greeting} ${userFirstName}, you have a total of ${numberOfAccounts} accounts with a combined balance of NGN ${totalBalance}. 
            Here is a summary of your last two transactions: ${transactionSummary}
        `;

        const aiSummary = await generateText(prompt); 

        await activityMiddleware(req, user.id, 'Member savings fetched successfully', 'SAVINGS');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Member savings fetched successfully",
            statuscode: StatusCodes.OK,
            data: {
                accountDetails,
                lastTenTransactions: allTransactions,
                details: aiSummary
            },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching member savings', 'SAVINGS');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getMemberSavings };
