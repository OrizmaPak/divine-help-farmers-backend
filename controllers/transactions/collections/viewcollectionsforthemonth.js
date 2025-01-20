const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const getUserMonthlyviewCollection = async (req, res) => {
    const user = req.user;
    const { date, userid, branch, registrationpoint } = req.query;

    if (!date) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Date is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Missing date"]
        });
    }

    const [year, month] = date.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid date format. Expected YYYY-MM",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid date format"]
        });
    }

    // Determine number of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();

    let results = [];
    let totalNoOfCollections = 0;
    let totalAmountCollected = 0;
    let totalRemitted = 0;
    let totalExcess = 0;
    let totalToBalance = 0;
    let totalPenalty = 0;

    try {
        // Build the query dynamically based on optional filters

        const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));
        let queryConditions = [];
        let queryParams = [monthStart.toISOString(), monthEnd.toISOString()];
        let paramIndex = 3;

        if (userid) {
            queryConditions.push(`userid = $${paramIndex++}`);
            queryParams.push(userid);
        }
        // if (branch) {
        //     queryConditions.push(`branch = $${paramIndex++}`);
        //     queryParams.push(branch);
        // }
        // if (registrationpoint) {
        //     queryConditions.push(`registrationpoint = $${paramIndex++}`);
        //     queryParams.push(registrationpoint);
        // }
        const monthDataQuery = `
                SELECT * FROM divine."transaction"
                WHERE transactiondate >= $1
                AND transactiondate < $2
                AND "cashref" IS NOT NULL
                AND "cashref" <> ''
                AND ttype IN ('CREDIT', 'DEBIT')
                AND status = 'ACTIVE'
                ${queryConditions.length ? 'AND ' + queryConditions.join(' AND ') : ''}
        `;
        const monthDataResult = await pg.query(monthDataQuery, queryParams);
        const monthData = monthDataResult.rows;

        const userBranchRegPointMap = {};

        // Fetch user details for each transaction to get branch and registration point
        for (const tx of monthData) {
            const userId = tx.userid;
            if (!userBranchRegPointMap[userId]) {
                const userQuery = `
                    SELECT branch, registrationpoint FROM divine."User"
                    WHERE id = $1
                `;
                const { rows: userRows } = await pg.query(userQuery, [userId]);
                if (userRows.length > 0) {
                    const { branch, registrationpoint } = userRows[0];
                    userBranchRegPointMap[userId] = { branch, registrationpoint };
                }
            }
        }

        // Filter transactions by branch and registration point
        const filteredMonthData = monthData.filter(tx => {
            const userId = tx.userid;
            const userDetails = userBranchRegPointMap[userId];
            if (!userDetails) return false;

            const branchMatch = !branch || userDetails.branch == branch;
            const regPointMatch = !registrationpoint || userDetails.registrationpoint == registrationpoint;

            return branchMatch && regPointMatch;
        });

        // Use filteredMonthData for further processing

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(year, month - 1, day));
            const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
            
            // Filter transactions for the current day
            const dayData = filteredMonthData.filter(tx => {
                const txDate = new Date(tx.transactiondate);
                return txDate >= startOfDay && txDate <= endOfDay;
            });
            
            // Calculate number of credit transactions and amount collected
            const creditTransactions = dayData.filter(tx => tx.ttype == 'CREDIT');
            console.log('dayData', day, creditTransactions);
            const noofcollections = creditTransactions.length;
            const amountcollected = creditTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);

            // Calculate total debit amount
            const debitSum = dayData.filter(tx => tx.ttype == 'DEBIT').reduce((sum, tx) => sum + (tx.debit || 0), 0);

            // Fetch related bank transactions
            const transactionRefs = dayData.map(tx => tx.cashref).filter(ref => ref);
            let remitted = 0;

            if (transactionRefs.length > 0) {
                const bankTxQuery = `
                    SELECT credit, debit FROM divine."banktransaction"
                    WHERE transactionref = $1
                `;
                const bankTxResult = await pg.query(bankTxQuery, [transactionRefs]);
                const bankTransactions = bankTxResult.rows;

                const bankTxSum = bankTransactions.reduce((sum, btx) => sum + (parseInt(btx.credit || 0) - parseInt(btx.debit || 0)), 0);
                remitted = bankTxSum + debitSum;
            }
 
            // Calculate penalties
            const penaltyRefs = transactionRefs.map(ref => `${ref}-P`);
            let penaltySum = 0;

            if (penaltyRefs.length > 0) {
                const penaltyQuery = `
                    SELECT debit, credit FROM divine."transaction"
                    WHERE cashref = ANY($1)
                `;
                const penaltyResult = await pg.query(penaltyQuery, [penaltyRefs]);
                const penaltyTransactions = penaltyResult.rows;

                penaltySum = penaltyTransactions.reduce((sum, ptx) => sum + (parseInt(ptx.debit || 0) - parseInt(ptx.credit || 0)), 0);
            }

            // Calculate excess and tobalance
            const net = amountcollected - remitted;
            let excess = 0;
            let tobalance = 0;

            if (net > 0) {
                tobalance = net;
            } else {
                excess = Math.abs(net);
            }

            // Update totals
            totalNoOfCollections += noofcollections;
            totalAmountCollected += amountcollected;
            totalRemitted += remitted;
            totalExcess += excess;
            totalToBalance += tobalance;
            totalPenalty += penaltySum;

            results.push({
                day: currentDate.toISOString().split('T')[0], // Format day as YYYY-MM-DD
                noofcollections,
                amountcollected,
                remitted,
                excess,
                tobalance,
                penalty: penaltySum,
                transactions: creditTransactions
            });
        }

        const totals = {
            totalNoOfCollections,
            totalAmountCollected,
            totalRemitted,
            totalExcess,
            totalToBalance,
            totalPenalty
        };

        await activityMiddleware(req, user.id, 'User monthly collection fetched successfully', 'USER_MONTHLY_COLLECTION');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "User monthly collection fetched successfully",
            statuscode: StatusCodes.OK,
            data: results,
            totals,
            errors: []
        });
    } catch (error) {
        console.error('Error fetching user monthly collection:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching user monthly collection', 'USER_MONTHLY_COLLECTION');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
}; 

module.exports = { getUserMonthlyviewCollection };
