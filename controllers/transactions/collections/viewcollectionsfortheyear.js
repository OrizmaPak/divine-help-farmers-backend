const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const viewCollectionsForTheYear = async (req, res) => {
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

    const year = Number(date);
    if (!year || year < 1000 || year > 9999) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid date format. Expected YYYY",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Invalid date format"]
        });
    }

    const monthsInYear = 12;

    let results = [];
    let totalNoOfCollections = 0;
    let totalAmountCollected = 0;
    let totalRemitted = 0;
    let totalExcess = 0;
    let totalToBalance = 0;
    let totalPenalty = 0;

    try {
        const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
        const yearEnd = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
        let queryConditions = [];
        let queryParams = [yearStart.toISOString(), yearEnd.toISOString()];
        let paramIndex = 3;

        if (userid) {
            queryConditions.push(`userid = $${paramIndex++}`);
            queryParams.push(userid);
        }

        const yearDataQuery = `
                SELECT * FROM divine."transaction"
                WHERE transactiondate >= $1
                AND transactiondate < $2
                AND "cashref" IS NOT NULL
                AND "cashref" <> ''
                AND ttype IN ('CREDIT', 'DEBIT')
                AND status = 'ACTIVE'
                ${queryConditions.length ? 'AND ' + queryConditions.join(' AND ') : ''}
        `;
        const yearDataResult = await pg.query(yearDataQuery, queryParams);
        const yearData = yearDataResult.rows;

        const userBranchRegPointMap = {};

        for (const tx of yearData) {
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

        const filteredYearData = yearData.filter(tx => {
            const userId = tx.userid;
            const userDetails = userBranchRegPointMap[userId];
            if (!userDetails) return false;

            const branchMatch = !branch || userDetails.branch == branch;
            const regPointMatch = !registrationpoint || userDetails.registrationpoint == registrationpoint;

            return branchMatch && regPointMatch;
        });

        for (let month = 1; month <= monthsInYear; month++) {
            const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
            const monthEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));

            const monthData = filteredYearData.filter(tx => {
                const txDate = new Date(tx.transactiondate);
                return txDate >= monthStart && txDate < monthEnd;
            });

            const creditTransactions = monthData.filter(tx => tx.ttype === 'CREDIT');
            const noofcollections = creditTransactions.length;
            const amountcollected = creditTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);

            const debitSum = monthData.filter(tx => tx.ttype === 'DEBIT').reduce((sum, tx) => sum + (tx.debit || 0), 0);

            const transactionRefs = monthData.map(tx => tx.cashref).filter(ref => ref);
            let remitted = 0;

            if (transactionRefs.length > 0) {
                const bankTxQuery = `
                    SELECT credit, debit FROM divine."banktransaction"
                    WHERE transactionref = ANY($1)
                `;
                const bankTxResult = await pg.query(bankTxQuery, [transactionRefs]);
                const bankTransactions = bankTxResult.rows;

                const bankTxSum = bankTransactions.reduce((sum, btx) => sum + ((btx.credit || 0) - (btx.debit || 0)), 0);
                remitted = bankTxSum + debitSum;
            }

            const penaltyRefs = transactionRefs.map(ref => `${ref}-P`);
            let penaltySum = 0;

            if (penaltyRefs.length > 0) {
                const penaltyQuery = `
                    SELECT debit, credit FROM divine."transaction"
                    WHERE cashref = ANY($1)
                `;
                const penaltyResult = await pg.query(penaltyQuery, [penaltyRefs]);
                const penaltyTransactions = penaltyResult.rows;

                penaltySum = penaltyTransactions.reduce((sum, ptx) => sum + ((ptx.debit || 0) - (ptx.credit || 0)), 0);
            }

            const net = amountcollected - remitted;
            let excess = 0;
            let tobalance = 0;

            if (net > 0) {
                tobalance = net;
            } else {
                excess = Math.abs(net);
            }

            totalNoOfCollections += noofcollections;
            totalAmountCollected += amountcollected;
            totalRemitted += remitted;
            totalExcess += excess;
            totalToBalance += tobalance;
            totalPenalty += penaltySum;

            results.push({
                month: monthStart.toISOString().split('T')[0].slice(0, 7),
                noofcollections,
                amountcollected,
                remitted,
                excess,
                tobalance,
                penalty: penaltySum
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

        await activityMiddleware(req, user.id, 'User yearly collection fetched successfully', 'USER_YEARLY_COLLECTION');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "User yearly collection fetched successfully",
            statuscode: StatusCodes.OK,
            data: results,
            totals,
            errors: []
        });
    } catch (error) {
        console.error('Error fetching user yearly collection:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching user yearly collection', 'USER_YEARLY_COLLECTION');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { viewCollectionsForTheYear };
