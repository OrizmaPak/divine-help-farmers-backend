/// Start Generation Here
const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const createBulkTransaction = async (req, res) => {
    const user = req.user;
    const {
        definmember,
        accounttype,
        product,
        eligibility,
        eligibilityminimumbalance,
        eligibilityminagemonths,
        eligibilityperiodbalance,
        eligibilityperiodmonth,
        actiontype,
        actionamount,
        actionamounttype,
        actionamountperiodmonth,
        description // Added description to destructured req.body
    } = req.body;

    try {
        // Validate required fields
        if (!definmember || !accounttype || !product) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Membership, accounttype, and product are required",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["Missing required fields"]
            });
        }

        // Determine the account table based on accounttype
        let tableName;
        switch (accounttype.toUpperCase()) {
            case "SAVINGS":
                tableName = 'savings';
                break;
            case "LOAN":
                tableName = 'loanaccounts';
                break;
            case "PROPERTY":
                tableName = 'propertyaccount';
                break;
            case "ROTARY":
                tableName = 'rotaryaccount';
                break;
            default:
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Invalid account type provided",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["Invalid account type"]
                });
        }

        // Get membership using definmember from membership table
        const membershipQuery = {
            text: `SELECT id FROM divine."Membership" WHERE member = $1 AND status = 'ACTIVE'`,
            values: [definmember]
        };
        const { rows: membershipRows } = await pg.query(membershipQuery);
        if (!membershipRows.length) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "No active membership found for provided definmember",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }
        const membershipId = membershipRows[0].id;

        // Fetch all active accounts from the relevant table
        let accountQuery;
        switch (accounttype.toUpperCase()) {
            case "SAVINGS":
                accountQuery = {
                    text: `SELECT id, accountnumber, dateadded
                           FROM divine."savings"
                           WHERE savingsproductid = $1
                             AND member = $2
                             AND status = 'ACTIVE'`,
                    values: [product, membershipId]
                };
                break;
            case "LOAN":
                accountQuery = {
                    text: `SELECT id, accountnumber, dateadded
                           FROM divine."loanaccounts"
                           WHERE loanproduct = $1
                             AND member = $2
                             AND status = 'ACTIVE'`,
                    values: [product, membershipId]
                };
                break;
            case "PROPERTY":
                accountQuery = {
                    text: `SELECT id, accountnumber, dateadded
                           FROM divine."propertyaccount"
                           WHERE productid = $1
                             AND membershipid = $2
                             AND status = 'ACTIVE'`,
                    values: [product, membershipId]
                };
                break;
            case "ROTARY":
                accountQuery = {
                    text: `SELECT id, accountnumber, dateadded
                           FROM divine."rotaryaccount"
                           WHERE productid = $1
                             AND member = $2
                             AND status = 'ACTIVE'`,
                    values: [product, membershipId]
                };
                break;
            default:
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Invalid account type provided",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["Invalid account type"]
                });
        }

        const { rows: accounts } = await pg.query(accountQuery);
        if (!accounts.length) {
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No active accounts found",
                statuscode: StatusCodes.OK,
                data: [],
                errors: []
            });
        }

        // Function to get current balance for an account
        async function getAccountBalance(accountnumber) {
            const balanceQuery = {
                text: `SELECT COALESCE(SUM(credit) - SUM(debit), 0) as balance
                       FROM divine."transaction"
                       WHERE accountnumber = $1
                         AND status = 'ACTIVE'`,
                values: [accountnumber]
            };
            const { rows } = await pg.query(balanceQuery);
            return Number(rows[0].balance) || 0;
        }

        // Function to get period balance (sum of credits-debits in last X months)
        async function getPeriodBalance(accountnumber, months) {
            const periodQuery = {
                text: `SELECT COALESCE(SUM(credit) - SUM(debit), 0) as balance
                       FROM divine."transaction"
                       WHERE accountnumber = $1
                         AND status = 'ACTIVE'
                         AND transactiondate >= (CURRENT_DATE - INTERVAL '${months} MONTH')`,
                values: [accountnumber]
            };
            const { rows } = await pg.query(periodQuery);
            return Number(rows[0].balance) || 0;
        }

        // Filter accounts based on eligibility if required
        const now = new Date();
        let eligibleAccounts = [];

        for (const acc of accounts) {
            const currentAccountBalance = await getAccountBalance(acc.accountnumber);

            // If eligibility is set to NO, skip all checks
            if (eligibility === "YES") {
                // 1) Check eligibilityminimumbalance
                if (
                    eligibilityminimumbalance &&
                    currentAccountBalance < Number(eligibilityminimumbalance)
                ) {
                    continue;
                }

                // 2) Check min account age in months
                if (eligibilityminagemonths) {
                    const accountCreateDate = new Date(acc.dateadded);
                    const ageInMonths =
                        (now.getFullYear() - accountCreateDate.getFullYear()) * 12 +
                        now.getMonth() -
                        accountCreateDate.getMonth();
                    if (ageInMonths < Number(eligibilityminagemonths)) {
                        continue;
                    }
                }

                // 3) Check period balance for the last X months
                if (eligibilityperiodbalance && eligibilityperiodmonth) {
                    const periodBal = await getPeriodBalance(
                        acc.accountnumber,
                        eligibilityperiodmonth
                    );
                    if (periodBal < Number(eligibilityperiodbalance)) {
                        continue;
                    }
                }
            }

            // If passed all checks
            eligibleAccounts.push({
                ...acc,
                currentBalance: currentAccountBalance
            });
        }

        if (!eligibleAccounts.length) {
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No accounts meet eligibility criteria",
                statuscode: StatusCodes.OK,
                data: [],
                errors: []
            });
        }

        // Now apply the action details for each eligible account
        const reference = `BULK||${Date.now()}`; // Single reference for all
        const transactionsResult = [];
        let totalCredit = 0;
        let totalDebit = 0;

        for (const acc of eligibleAccounts) {
            // Compute amount to use for debit/credit
            let computedAmount = 0;
            if (actionamounttype === "AMOUNT") {
                computedAmount = Number(actionamount);
            } else {
                // PERCENTAGE
                let baseBalance = 0;
                if (Number(actionamountperiodmonth) === 0) {
                    // Use current balance
                    baseBalance = acc.currentBalance;
                } else {
                    // Sum of credits - debits in last actionamountperiodmonth months
                    baseBalance = await getPeriodBalance(
                        acc.accountnumber,
                        actionamountperiodmonth
                    );
                }
                computedAmount = (baseBalance * Number(actionamount)) / 100;
            }

            let credit = 0;
            let debit = 0;
            if (actiontype.toUpperCase() === "CREDIT") {
                credit = computedAmount;
                totalCredit += credit;
            } else if (actiontype.toUpperCase() === "DEBIT") {
                debit = computedAmount;
                totalDebit += debit;
            } else {
                // Invalid actiontype
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Invalid action type",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["actiontype must be CREDIT or DEBIT"]
                });
            }

            // Insert transaction with status = PENDING APPROVAL
            const transactionData = {
                accountnumber: acc.accountnumber,
                credit: credit,
                debit: debit,
                reference: reference,
                status: 'PENDING APPROVAL',
                transactiondate: new Date(),
                description: description || 'Bulk transaction', // Use provided description or default
                currency: 'NGN', // Assuming currency is NGN
                transactiondesc: 'Bulk transaction', // Assuming transaction description
                branch: req.user.branch, // Assuming branch from user
                registrationpoint: req.user.registrationpoint, // Assuming registration point from user
                ttype: actiontype.toUpperCase(), // Assuming transaction type from actiontype
                tfrom: 'BANK', // Assuming transaction from is BULK
                tax: false, // Assuming tax is false
                userid: user.id // Adding userid from the user object
            };

            const insertTxQuery = {
                text: `INSERT INTO divine."transaction" 
                       (accountnumber, credit, debit, reference, status, transactiondate, description, currency, transactiondesc, branch, registrationpoint, ttype, tfrom, tax, userid)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                       RETURNING id, accountnumber, credit, debit, reference, status, currency, transactiondesc, branch, registrationpoint, ttype, tfrom, tax, userid`,
                values: Object.values(transactionData)
            };
            const { rows: [txRow] } = await pg.query(insertTxQuery);
            transactionsResult.push({
                ...txRow,
                amountAffected: credit > 0 ? credit : debit
            });
        }

        await activityMiddleware(req, user.id, 'Bulk transactions created successfully', 'TRANSACTION');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Bulk transactions created successfully",
            statuscode: StatusCodes.OK,
            data: transactionsResult,
            summary: {
                totalTransactions: transactionsResult.length,
                totalCredit,
                totalDebit,
                description: "This action has not been initiated. Still pending approval"
            },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred creating bulk transactions', 'TRANSACTION');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { createBulkTransaction };
/// End Generation Here
