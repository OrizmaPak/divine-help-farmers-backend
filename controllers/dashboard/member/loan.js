const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { divideAndRoundUp } = require("../../../utils/pageCalculator");
const { generateText } = require("../../ai/ai");

const getMemberLoanAccounts = async (req, res) => {
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
        // Base SQL query with member filter and status ACTIVE
        let baseQuery = `
            SELECT 
                la.id,
                la.userid,
                la.accountofficer,
                la.loanproduct,
                la.member,
                la.branch,
                la.registrationpoint,
                la.numberofrepayments,
                la.duration,
                la.interestrate,
                la.registrationcharge,
                la.defaultpenaltyid,
                la.seperateinterest,
                la.registrationdate,
                la.dateadded,
                la.dateclosed,
                la.closeamount,
                la.createdby,
                la.disbursementref,
                la.accountnumber,
                la.registrationdesc,
                la.bankname1,
                la.bankaccountname1,
                la.bankaccountnumber1,
                la.bankname2,
                la.bankaccountname2,
                la.bankaccountnumber2,
                la.repaymentfrequency,
                la.durationcategory,
                la.interestmethod,
                la.interestratetype,
                la.status,
                la.loanamount,

                CONCAT(u1.firstname, ' ', u1.lastname, ' ', COALESCE(u1.othernames, '')) AS useridname,
                CONCAT(
                    COALESCE(u2.firstname, ''), ' ', 
                    COALESCE(u2.lastname, ''), ' ', 
                    COALESCE(u2.othernames, '')
                ) AS accountofficername,
                lp.productname AS loanproductname,
                row_to_json(lp) AS productdetails,
                dm.member AS membername,
                br.branch AS branchname,
                COALESCE(rp.registrationpoint, 'N/A') AS registrationpointname,
                COALESCE(json_agg(c) FILTER (WHERE c.id IS NOT NULL), '[]') AS collaterals
            FROM divine."loanaccounts" la
            JOIN divine."User" u1 ON la.userid::text = u1.id::text
            LEFT JOIN divine."User" u2 ON la.accountofficer::text = u2.id::text
            JOIN divine."loanproduct" lp ON la.loanproduct::text = lp.id::text
            JOIN divine."DefineMember" dm ON la.member::text = dm.id::text
            JOIN divine."Branch" br ON la.branch::text = br.id::text
            LEFT JOIN divine."Registrationpoint" rp ON la.registrationpoint::text = rp.id::text
            LEFT JOIN divine."collateral" c ON la.accountnumber::text = c.accountnumber::text
            WHERE la.member = $1 AND la.status = 'ACTIVE' AND la.userid = $2
            GROUP BY 
                la.id, 
                u1.firstname, 
                u1.lastname, 
                u1.othernames, 
                u2.firstname, 
                u2.lastname, 
                u2.othernames, 
                lp.productname, 
                dm.member, 
                br.branch, 
                rp.registrationpoint, 
                lp.id
        `;

        // Add pagination
        const searchParams = new URLSearchParams(req.query);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || process.env.DEFAULT_LIMIT || '100', 10);
        const offset = (page - 1) * limit;

        baseQuery += `\nLIMIT $3 OFFSET $4`;

        // Finalize the query
        const finalQuery = {
            text: baseQuery,
            values: [member, user.id, limit, offset]
        };

        // Execute the main query
        const result = await pg.query(finalQuery);
        const loanAccounts = result.rows;

        if (loanAccounts.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "No active loan accounts found for member",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        // Fetch detailed account information for each loan account
        const detailedAccounts = await Promise.all(loanAccounts.map(async (account) => {
            const accountDetailsQuery = {
                text: `SELECT * FROM divine."loanaccounts" WHERE accountnumber = $1`,
                values: [account.accountnumber]
            };
            const accountDetailsResult = await pg.query(accountDetailsQuery);

            if (accountDetailsResult.rowCount === 0) {
                return null;
            }

            const loanAccount = accountDetailsResult.rows[0];

            // Fetch loan payment schedule
            const loanPaymentScheduleQuery = {
                text: `SELECT * FROM divine."loanpaymentschedule" WHERE accountnumber = $1`,
                values: [account.accountnumber]
            };
            const loanPaymentScheduleResult = await pg.query(loanPaymentScheduleQuery);

            const installments = loanPaymentScheduleResult.rows;

            // Fetch all transactions for the accountnumber
            const transactionsQuery = {
                text: `SELECT * FROM divine."transaction" WHERE accountnumber = $1 AND status = 'ACTIVE'`,
                values: [account.accountnumber]
            };
            const transactionsResult = await pg.query(transactionsQuery);

            const transactions = transactionsResult.rows;

            let totalBalancePaid = 0;
            if (!loanAccount.disbursementref) {
                transactions.forEach(transaction => {
                    totalBalancePaid += transaction.credit - transaction.debit;
                });
                installments.forEach(installment => {
                    installment.paymentstatus = 'NOT OWED';
                    installment.amountpaid = 0;
                    installment.amountunpaid = installment.scheduleamount + installment.interestamount;
                });
            } else {
                transactions.forEach(transaction => {
                    totalBalancePaid += transaction.credit - transaction.debit;
                });

                installments.forEach(installment => {
                    const amountToBePaid = installment.scheduleamount + installment.interestamount;
                    if (totalBalancePaid >= amountToBePaid) {
                        installment.paymentstatus = 'FULLY PAID';
                        installment.amountpaid = amountToBePaid;
                        installment.amountunpaid = 0;
                        totalBalancePaid -= amountToBePaid;
                    } else if (totalBalancePaid > 0) {
                        installment.paymentstatus = 'PARTLY PAID';
                        installment.amountpaid = totalBalancePaid;
                        installment.amountunpaid = amountToBePaid - totalBalancePaid;
                        totalBalancePaid = 0;
                    } else {
                        installment.paymentstatus = 'UNPAID';
                        installment.amountpaid = 0;
                        installment.amountunpaid = amountToBePaid;
                    }
                });
            }

            let penalties = [];
            if (loanAccount.defaultpenaltyid) {
                const penaltyQuery = {
                    text: `SELECT * FROM divine."loanfee" WHERE id = $1`,
                    values: [loanAccount.defaultpenaltyid]
                };
                const penaltyResult = await pg.query(penaltyQuery);
                penalties = penaltyResult.rows;
            }

            const response = {
                ...loanAccount,
                installments,
                refund: transactions.length > 0 ? totalBalancePaid : 0,
                penalties
            };

            return response;
        }));

        // Filter out any null results from the detailed accounts
        const validDetailedAccounts = detailedAccounts.filter(account => account !== null);

        // Generate a brief overview for each account
        const overviews = await Promise.all(validDetailedAccounts.map(async (account) => {
            const prompt = `Hello! Here's a quick look at your loan account: ${JSON.stringify(account)}. Please note the next payment due date and make sure to pay on time. Thank you!`;
            return await generateText(prompt);
        }));

        // Fetch the last 10 transactions for the user considering all accounts
        const allTransactionsQuery = {
            text: `SELECT * FROM divine."transaction" WHERE accountnumber = ANY($1::text[]) ORDER BY transactiondate DESC LIMIT 10`,
            values: [loanAccounts.map(account => account.accountnumber)]
        };
        const { rows: lastTenTransactions } = await pg.query(allTransactionsQuery);

        // Get total count for pagination
        const countQueryText = `
            SELECT COUNT(DISTINCT la.id) AS total
            FROM divine."loanaccounts" la
            WHERE la.member = $1 AND la.status = 'ACTIVE'
        `;

        const countQuery = {
            text: countQueryText,
            values: [member]
        };

        const countResult = await pg.query(countQuery);
        const total = countResult.rows[0].total || 0;
        const pages = divideAndRoundUp(Number(total), limit);

        // Log activity
        await activityMiddleware(req, user.id, 'Member loan accounts fetched successfully', 'LOAN_ACCOUNT');

        // Respond with data, overviews, last ten transactions, and pagination info
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Member loan accounts fetched successfully",
            statuscode: StatusCodes.OK,
            data: {
                validDetailedAccounts,
                details: overviews,
                lastTenTransactions
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
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching member loan accounts', 'LOAN_ACCOUNT');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getMemberLoanAccounts };
