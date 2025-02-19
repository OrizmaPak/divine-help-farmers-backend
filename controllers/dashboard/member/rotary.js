const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { divideAndRoundUp } = require("../../../utils/pageCalculator");
const { generateText } = require("../../ai/ai");

const getMemberRotaryAccounts = async (req, res) => {
    const user = req.user;
    const { member } = req.query;

    if (!member) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Member is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Member is required"]
        });
    }

    try {
        // Fetch accounts with pagination
        const searchParams = new URLSearchParams(req.query);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || process.env.DEFAULT_LIMIT, 10);
        const offset = (page - 1) * limit;

        const query = {
            text: `SELECT * FROM divine."rotaryaccount" WHERE member = $1 AND userid = $2 AND status = $3 ORDER BY dateadded DESC LIMIT $4 OFFSET $5`,
            values: [member, user.id, 'ACTIVE', limit, offset]
        };
        
        const accountResult = await pg.query(query);
        const accounts = accountResult.rows;

        // Get total count for pagination
        const countQuery = {
            text: `SELECT COUNT(*) FROM divine."rotaryaccount" WHERE member = $1 AND userid = $2 AND status = 'ACTIVE'`,
            values: [member, user.id]
        };
        const { rows: [{ count: total }] } = await pg.query(countQuery);
        const pages = divideAndRoundUp(total, limit);

        // Process each account to fetch its schedules and additional details
        const processedAccounts = await Promise.all(accounts.map(async (account) => {
            const accountNumber = account.accountnumber;

            // Fetch schedules for the account sorted by due date
            const scheduleQuery = {
                text: `
                    SELECT * FROM divine."rotaryschedule" 
                    WHERE accountnumber = $1 AND status = 'ACTIVE'
                    ORDER BY duedate ASC
                `,
                values: [accountNumber]
            };
            const scheduleResult = await pg.query(scheduleQuery);
            const schedules = scheduleResult.rows;

            // Initialize variables to track total remaining amount and next due date
            let totalRemainingAmount = 0;
            let nextDueDate = null;

            // Process each schedule
            const processedSchedules = schedules.map((schedule) => {
                const { amount, duedate } = schedule;

                let remainingAmount = amount;
                totalRemainingAmount += remainingAmount;

                let scheduleStatus;
                const dueDate = new Date(duedate);
                const today = new Date();

                if (dueDate <= today) {
                    scheduleStatus = "DUE FOR PAYMENT";
                } else {
                    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                    scheduleStatus = `DUE IN ${daysLeft} DAYS LEFT`;

                    // Update next due date if it's the earliest upcoming due date
                    if (!nextDueDate || dueDate < nextDueDate) {
                        nextDueDate = dueDate;
                    }
                }

                return {
                    ...schedule,
                    scheduleStatus,
                    remainingAmount
                };
            });

            return {
                ...account,
                schedules: processedSchedules,
                totalRemainingAmount, // Add total remaining amount to the account
                nextduedate: nextDueDate // Add next due date to the account
            };
        }));

        // Generate an overview for each processed account using AI
        const prompt = `Hello! Here's a quick look at your rotary account: ${JSON.stringify(processedAccounts)}. Please note the next payment due date and make sure to pay on time. Thank you! thats all`;
        let overviews = await generateText(prompt);

        await activityMiddleware(req, user.id, 'Member rotary accounts fetched successfully', 'ROTARY_ACCOUNT_FETCH');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Member rotary accounts fetched successfully",
            statuscode: StatusCodes.OK,
            data: {
                processedAccounts,
                details: overviews
            },
            pagination: { 
                total: Number(total),
                pages,
                page,
                limit
            }, 
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching member rotary accounts', 'ROTARY_ACCOUNT_ERROR');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getMemberRotaryAccounts };
