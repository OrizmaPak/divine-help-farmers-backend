const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { generateText } = require("../../ai/ai");

const getMemberSavings = async (req, res) => {
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
            text: `SELECT accountnumber, savingsproductid FROM divine."savings" WHERE member = $1`,
            values: [memberId]
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
                text: `SELECT SUM(credit) - SUM(debit) as balance FROM divine."transaction" WHERE accountnumber = $1`,
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
                productname
            };
        }));

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
