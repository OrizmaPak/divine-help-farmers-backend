const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const getUserYearlyCollection = async (req, res) => {
    const user = req.user;
    const { date, userid } = req.query;

    if (!date || !userid) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Date and userid are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Missing date or userid"]
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
        // Fetch transactions for the user within the specified year
        const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
        const yearEnd = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));
        const yearDataQuery = `
                SELECT * FROM divine."transaction"
                WHERE userid = $1
                AND transactiondate >= $2
                AND transactiondate < $3
                AND "cashref" IS NOT NULL
                AND "cashref" <> ''
                AND ttype IN ('CREDIT', 'DEBIT')
                AND status = 'ACTIVE'
        `;
        const yearDataResult = await pg.query(yearDataQuery, [userid, yearStart.toISOString(), yearEnd.toISOString()]);
        const yearData = yearDataResult.rows;
        
        for (let month = 1; month <= monthsInYear; month++) {
            const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
            const monthEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));
            const daysInMonth = new Date(year, month, 0).getDate();

            // Filter transactions for the current month
            const monthData = yearData.filter(tx => {
                const txDate = new Date(tx.transactiondate);
                return txDate >= monthStart && txDate < monthEnd;
            });

            // Calculate number of credit transactions and amount collected
            const creditTransactions = monthData.filter(tx => tx.ttype === 'CREDIT');
            console.log('monthData', month, creditTransactions);
            const noofcollections = creditTransactions.length;
            const amountcollected = creditTransactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);

            // Calculate total debit amount
            const debitSum = monthData.filter(tx => tx.ttype === 'DEBIT').reduce((sum, tx) => sum + (tx.debit || 0), 0);

            // Fetch related bank transactions
            const transactionRefs = monthData.map(tx => tx.cashref).filter(ref => ref);
            let remitted = 0;

            if (transactionRefs.length > 0) {
                const bankTxQuery = `
                    SELECT credit, debit FROM divine."banktransaction"
                    WHERE transactionref = ANY($1)
                    AND transactiondate >= $2
                    AND transactiondate < $3
                `;
                const bankTxResult = await pg.query(bankTxQuery, [transactionRefs, monthStart.toISOString(), monthEnd.toISOString()]);
                const bankTransactions = bankTxResult.rows;

                const bankTxSum = bankTransactions.reduce((sum, btx) => sum + ((btx.credit || 0) - (btx.debit || 0)), 0);
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

                penaltySum = penaltyTransactions.reduce((sum, ptx) => sum + ((ptx.debit || 0) - (ptx.credit || 0)), 0);
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
                month: monthStart.toISOString().split('T')[0].slice(0,7), // Format month as YYYY-MM
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

module.exports = { getUserYearlyCollection };
