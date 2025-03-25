const { StatusCodes } = require("http-status-codes");
const pg = require("../../../../db/pg");
const { activityMiddleware } = require("../../../../middleware/activity");

const getUserMemberSavingsMonthly = async (req, res) => {
    const user = req.user;
    const { userid, member, year } = req.query;

    if (!userid || !member) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "userid and member are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["userid or member not provided"]
        });
    }

    try {
        // Fetch all savings accounts for the given userid and member
        const savingsAccountsQuery = {
            text: `
                SELECT s.accountnumber, sp.productname
                FROM divine."savings" s
                JOIN divine."savingsproduct" sp ON s.savingsproductid = sp.id
                WHERE s.userid = $1 AND s.member = $2
            `,
            values: [userid, member]
        };

        const { rows: savingsAccounts } = await pg.query(savingsAccountsQuery);

        if (savingsAccounts.length === 0) {
            await activityMiddleware(req, user.id, 'No Savings Accounts Found', 'SAVINGS');
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No savings accounts found for the specified userid and member",
                statuscode: StatusCodes.OK,
                data: [],
                errors: []
            });
        }

        // Structure to hold final data
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

        let allAccountsData = [];
        let grandTotalBalance = 0;

        // For each savings account, calculate monthly in/out and balance
        for (const acc of savingsAccounts) {
            // Prepare monthly structure for each account
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

            // First, get balance brought forward (sum of all previous years)
            let balanceBroughtForward = 0;
            if (year) {
                const balanceBroughtForwardQuery = {
                    text: `
                        SELECT COALESCE(SUM(credit) - SUM(debit), 0) as balance_before_year
                        FROM divine."transaction"
                        WHERE accountnumber = $1 
                        AND EXTRACT(YEAR FROM transactiondate) < $2
                    `,
                    values: [acc.accountnumber, year]
                };
                const { rows: [bfRow] } = await pg.query(balanceBroughtForwardQuery);
                balanceBroughtForward = bfRow.balance_before_year || 0;
            }

            // Next, get monthly credit and debit for the specified year (if provided) or all-time
            let monthlyQueryCondition = '';
            let monthlyQueryValues = [acc.accountnumber];
            if (year) {
                monthlyQueryCondition = 'AND EXTRACT(YEAR FROM transactiondate) = $2';
                monthlyQueryValues.push(year);
            }

            const monthlyTransactionsQuery = {
                text: `
                    SELECT EXTRACT(MONTH FROM transactiondate) as month,
                           SUM(credit) as total_credit,
                           SUM(debit) as total_debit
                    FROM divine."transaction"
                    WHERE accountnumber = $1
                    ${monthlyQueryCondition}
                    GROUP BY month
                    ORDER BY month
                `,
                values: monthlyQueryValues
            };

            const { rows: monthlyTransactions } = await pg.query(monthlyTransactionsQuery);

            // Calculate monthly balances
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

            // Update overall monthly data
            let accumulativeBalance = balanceBroughtForward;
            for (let m in monthlyData) {
                overallMonthly[m].credit += monthlyData[m].credit;
                overallMonthly[m].debit += monthlyData[m].debit;
                accumulativeBalance += (monthlyData[m].credit - monthlyData[m].debit);
            }

            const finalBalance = runningBalance;

            grandTotalBalance += finalBalance;

            allAccountsData.push({
                accountnumber: acc.accountnumber,
                productname: acc.productname,
                balance_brought_forward: balanceBroughtForward,
                monthlyData,
                finalBalance
            });
        }

        // Recalculate monthly balances for overallMonthly by adding them cumulatively
        let runningOverall = 0;
        const monthOrder = [
            "january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"
        ];
        monthOrder.forEach(mon => {
            runningOverall += (overallMonthly[mon].credit - overallMonthly[mon].debit);
            overallMonthly[mon].balance = runningOverall;
        });

        await activityMiddleware(req, user.id, 'User-member savings monthly data fetched successfully', 'SAVINGS');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "User-member savings monthly data fetched successfully",
            statuscode: StatusCodes.OK,
            data: {
                accounts: allAccountsData,
                overallMonthly,
                grandTotalBalance
            },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching user-member savings monthly data', 'SAVINGS');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getUserMemberSavingsMonthly };
