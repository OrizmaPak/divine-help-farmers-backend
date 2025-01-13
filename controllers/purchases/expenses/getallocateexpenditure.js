const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");
const { activityMiddleware } = require("../../middleware/activity");
const { divideAndRoundUp } = require("../../utils/pageCalculator");

const getTransactionsAndBalance = async (req, res) => {
    const user = req.user;

    try {
        const { userid, page = 1, limit = process.env.DEFAULT_LIMIT } = req.query;

        // Fetch organization settings
        const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings"`;
        const orgSettingsResult = await pg.query(orgSettingsQuery);

        if (orgSettingsResult.rows.length === 0) {
            await activityMiddleware(req, user.id, 'Organization settings not found', 'EXPENDITURE_ALLOCATION');
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Organization settings not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const orgSettings = orgSettingsResult.rows[0];

        // Get transactions and calculate balance for the default_allocation_account
        let transactionsQuery, transactionsResult, balanceQuery, balanceResult;
        const offset = (page - 1) * limit;

        if (userid) {
            transactionsQuery = `
                SELECT 
                    credit, debit, transactiondate, description 
                FROM divine."transactions" 
                WHERE accountnumber = $1 AND userid = $2
                LIMIT $3 OFFSET $4
            `;
            transactionsResult = await pg.query(transactionsQuery, [orgSettings.default_allocation_account, userid, limit, offset]);

            balanceQuery = `
                SELECT 
                    COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) AS balance 
                FROM divine."transactions" 
                WHERE accountnumber = $1 AND userid = $2
            `;
            balanceResult = await pg.query(balanceQuery, [orgSettings.default_allocation_account, userid]);
        } else {
            transactionsQuery = `
                SELECT 
                    credit, debit, transactiondate, description 
                FROM divine."transactions" 
                WHERE accountnumber = $1
                LIMIT $2 OFFSET $3
            `;
            transactionsResult = await pg.query(transactionsQuery, [orgSettings.default_allocation_account, limit, offset]);

            balanceQuery = `
                SELECT 
                    COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) AS balance 
                FROM divine."transactions" 
                WHERE accountnumber = $1
            `;
            balanceResult = await pg.query(balanceQuery, [orgSettings.default_allocation_account]);
        }

        const balance = balanceResult.rows.length > 0 ? balanceResult.rows[0].balance : 0;

        // Get total count for pagination
        const countQuery = {
            text: `SELECT COUNT(*) FROM divine."transactions" WHERE accountnumber = $1 ${userid ? 'AND userid = $2' : ''}`,
            values: userid ? [orgSettings.default_allocation_account, userid] : [orgSettings.default_allocation_account]
        };
        const { rows: [{ count: total }] } = await pg.query(countQuery);
        const pages = divideAndRoundUp(total, limit);

        await activityMiddleware(req, user.id, 'Transactions and balance fetched successfully', 'EXPENDITURE_ALLOCATION');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Transactions and balance fetched successfully",
            statuscode: StatusCodes.OK,
            data: {
                transactions: transactionsResult.rows,
                balance: balance
            },
            pagination: {
                total: Number(total),
                pages,
                page: Number(page),
                limit: Number(limit)
            },
            errors: []
        });
    } catch (error) {
        console.error('Error fetching transactions and balance:', error);
        await activityMiddleware(req, user.id, 'Error fetching transactions and balance', 'EXPENDITURE_ALLOCATION');
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal Server Error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = getTransactionsAndBalance;
