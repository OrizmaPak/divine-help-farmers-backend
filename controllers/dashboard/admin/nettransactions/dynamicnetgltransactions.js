// Start Generation Here
const { StatusCodes } = require("http-status-codes");
const { activityMiddleware } = require("../../../../middleware/activity");
const pg = require("../../../../db/pg");

const getAssetsByKeys = async (req, res) => {
    // parse keys from query
    const { keys: keysParam, year: yearParam } = req.query;
    
    if (!keysParam) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "keys parameter is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["keys not provided"]
        });
    }

    // default year to current year if not provided
    const year = parseInt(yearParam, 10) || new Date().getFullYear();

    // convert "key1,key2,key3" into an array
    const keys = keysParam.split(",").map(k => k.trim()).filter(Boolean);

    try {
        // fetch the organisation settings row
        const orgSettingsQuery = {
            text: `SELECT * FROM divine."Organisationsettings" WHERE id = 1 LIMIT 1`,
            values: []
        };
        const { rows: orgRows } = await pg.query(orgSettingsQuery);

        if (!orgRows.length) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Organisationsettings not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const orgSettings = orgRows[0];
        const user = req.user || {};

        // prepare overall monthly aggregator
        let overallMonthly = {
            january: { credit: 0, debit: 0, balance: 0 },
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

        let allKeysData = [];
        let grandTotalBalance = 0;

        // for each key, retrieve the associated "account" from org settings
        for (const singleKey of keys) {
            const accountNumValue = orgSettings[singleKey];

            // if no valid account is found, skip
            if (!accountNumValue) {
                continue;
            }

            // treat the retrieved float as the accountnumber (stringify it)
            const accountnumber = String(accountNumValue).trim();

            // generate account name by replacing underscores with spaces and capitalizing each word
            const accountName = singleKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            // structure to hold monthly data for this account
            let monthlyData = {
                january: { credit: 0, debit: 0, balance: 0 },
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

             // get balance brought forward for all transactions before the given year
            const balanceBroughtForwardQuery = {
                text: `
                    SELECT COALESCE(SUM(credit) - SUM(debit), 0) as balance_before_year
                    FROM divine."transaction"
                    WHERE accountnumber = $1 
                    AND EXTRACT(YEAR FROM transactiondate) < $2
                    AND status = 'ACTIVE'
                `,
                values: [accountnumber, year]
            };
            const { rows: [bfRow] } = await pg.query(balanceBroughtForwardQuery);
            let balanceBroughtForward = bfRow.balance_before_year || 0;

            // next, get monthly credit/debit for the given year
            const monthlyTransactionsQuery = {
                text: `
                    SELECT EXTRACT(MONTH FROM transactiondate) as month,
                           SUM(credit) as total_credit,
                           SUM(debit) as total_debit
                    FROM divine."transaction"
                    WHERE accountnumber = $1
                      AND EXTRACT(YEAR FROM transactiondate) = $2
                      AND status = 'ACTIVE'
                    GROUP BY month
                    ORDER BY month
                `,
                values: [accountnumber, year]
            };

            const { rows: monthlyTransactions } = await pg.query(monthlyTransactionsQuery);

            // calculate monthly balances
            let runningBalance = balanceBroughtForward;
            monthlyTransactions.forEach(tx => {
                const monthNames = [
                    "january", "february", "march", "april", "may", "june",
                    "july", "august", "september", "october", "november", "december"
                ];
                const monthName = monthNames[tx.month - 1];

                monthlyData[monthName].credit = parseFloat(tx.total_credit || 0);
                monthlyData[monthName].debit = parseFloat(tx.total_debit || 0);
                runningBalance += (tx.total_credit || 0) - (tx.total_debit || 0);
                monthlyData[monthName].balance = runningBalance;
            });

            // update overall monthly aggregator
            let accumulativeBalance = balanceBroughtForward;
            for (let m in monthlyData) {
                overallMonthly[m].credit += monthlyData[m].credit;
                overallMonthly[m].debit += monthlyData[m].debit;
                accumulativeBalance += (monthlyData[m].credit - monthlyData[m].debit);
            }

            const finalBalance = runningBalance;
            grandTotalBalance += finalBalance;

            allKeysData.push({
                key: singleKey,
                accountName,
                accountnumber,
                balance_brought_forward: balanceBroughtForward,
                monthlyData,
                finalBalance
            });
        }

        // recalculate monthly aggregator's balances
        let runningOverall = 0;
        const monthOrder = [
            "january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"
        ];
        monthOrder.forEach(mon => {
            runningOverall += (overallMonthly[mon].credit - overallMonthly[mon].debit);
            overallMonthly[mon].balance = runningOverall;
        });

        // log the activity
        await activityMiddleware(req, user.id || 0, "Assets data fetched successfully", "ASSET");

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Assets data fetched successfully",
            statuscode: StatusCodes.OK,
            data: {
                year,
                details: allKeysData,
                overallMonthly,
                grandTotalBalance
            },
            errors: []
        });
    } catch (error) {
        console.error("Unexpected Error:", error);
        const user = req.user || {};
        await activityMiddleware(req, user.id || 0, "An unexpected error occurred fetching assets data", "ASSET");

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getAssetsByKeys };
