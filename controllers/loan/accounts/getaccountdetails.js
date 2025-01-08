const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");

const getLoanAccountDetails = async (req, res) => {
    const { accountnumber } = req.body;

    // Validation: Check if accountnumber is provided
    if (!accountnumber) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Account number is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Account number is required"]
        });
    }

    try {
        // Fetch loan account details
        const loanAccountQuery = {
            text: `SELECT * FROM divine."loanaccounts" WHERE accountnumber = $1`,
            values: [accountnumber]
        };
        const loanAccountResult = await pg.query(loanAccountQuery);

        // If no loan account found, return 404
        if (loanAccountResult.rowCount === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Loan account not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: ["Loan account not found"]
            });
        }

        const loanAccount = loanAccountResult.rows[0];

        // Initialize response object with loanAccount details
        const response = { ...loanAccount };

        // Check if disbursementref exists
        if (loanAccount.disbursementref) {
            // **Loan Disbursed: Proceed with Installment and Payment Calculations**

            // Fetch loan payment schedule
            const loanPaymentScheduleQuery = {
                text: `SELECT * FROM divine."loanpaymentschedule" WHERE accountnumber = $1 ORDER BY installmentnumber ASC`,
                values: [accountnumber]
            };
            const loanPaymentScheduleResult = await pg.query(loanPaymentScheduleQuery);

            const installments = loanPaymentScheduleResult.rows;

            // Fetch all transactions for the accountnumber
            const transactionsQuery = {
                text: `SELECT * FROM divine."transaction" WHERE accountnumber = $1`,
                values: [accountnumber]
            };
            const transactionsResult = await pg.query(transactionsQuery);

            const transactions = transactionsResult.rows;

            // Calculate total balance paid: sum of credits minus debits
            let totalBalancePaid = 0;
            transactions.forEach(transaction => {
                totalBalancePaid += (parseFloat(transaction.credit) || 0) - (parseFloat(transaction.debit) || 0);
            });

            // Match the money with the installments
            installments.forEach(installment => {
                const scheduleAmount = parseFloat(installment.scheduleamount) || 0;
                const interestAmount = parseFloat(installment.interestamount) || 0;
                const amountToBePaid = scheduleAmount + interestAmount;

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

            // Fetch penalties if any
            let penalties = [];
            if (loanAccount.defaultpenaltyid) {
                const penaltyQuery = {
                    text: `SELECT * FROM divine."loanfee" WHERE id = $1`,
                    values: [loanAccount.defaultpenaltyid]
                };
                const penaltyResult = await pg.query(penaltyQuery);
                penalties = penaltyResult.rows;
            }

            // Calculate the total loan amount (assuming 'loanamount' is a field in loanAccount)
            const loanAmount = parseFloat(loanAccount.loanamount) || 0;

            // Determine if there's an overpayment
            let pendingRefund = null;
            if (totalBalancePaid > 0) {
                // totalBalancePaid now represents the excess amount after paying all installments
                pendingRefund = {
                    amount: parseFloat(totalBalancePaid.toFixed(2)),
                    transactions: [] // To store transactions contributing to the excess
                };

                // Identify transactions contributing to the excess
                // Assuming transactions are ordered by date ascending
                let excessAmount = parseFloat(totalBalancePaid.toFixed(2));

                for (let txn of transactions) {
                    if (excessAmount <= 0) break;

                    const txnCredit = parseFloat(txn.credit) || 0;
                    if (txnCredit <= 0) continue;

                    if (txnCredit <= excessAmount) {
                        pendingRefund.transactions.push(txn);
                        excessAmount -= txnCredit;
                    } else {
                        // Partial transaction contributes to the excess
                        const partialTxn = { ...txn, credit: excessAmount };
                        pendingRefund.transactions.push(partialTxn);
                        excessAmount = 0;
                    }
                }

                // Update response message to include pending refund information
                response.pendingRefund = pendingRefund;
            }

            // Add installments and penalties to the response
            response.installments = installments;
            response.penalties = penalties;

            // Final response message
            let message = "Loan account details fetched successfully.";
            if (pendingRefund) {
                message += ` An excess payment of ${pendingRefund.amount.toFixed(2)} is pending refund.`;
            }

            return res.status(StatusCodes.OK).json({
                status: true,
                message: message,
                statuscode: StatusCodes.OK,
                data: response,
                errors: null
            });

        } else {
            // **Loan Not Disbursed: Handle Potential Refunds**

            // Fetch all credit transactions for the accountnumber
            const transactionsQuery = {
                text: `SELECT * FROM divine."transaction" WHERE accountnumber = $1 AND credit > 0`,
                values: [accountnumber]
            };
            const transactionsResult = await pg.query(transactionsQuery);

            const creditTransactions = transactionsResult.rows;

            // If there are credit transactions, prepare refund details
            if (creditTransactions.length > 0) {
                // Calculate total amount to refund: sum of all credit transactions
                const totalRefundAmount = creditTransactions.reduce((acc, txn) => acc + (parseFloat(txn.credit) || 0), 0);

                // Add refund details to the response
                response.refund = {
                    transactions: creditTransactions,
                    totalRefundAmount: parseFloat(totalRefundAmount.toFixed(2))
                };

                // Modify the response message to reflect refund details
                return res.status(StatusCodes.OK).json({
                    status: true,
                    message: `Loan has not been disbursed yet. A total of ${totalRefundAmount.toFixed(2)} should be refunded.`,
                    statuscode: StatusCodes.OK,
                    data: response,
                    errors: null
                });
            } else {
                // No disbursement and no credit transactions
                return res.status(StatusCodes.OK).json({
                    status: true,
                    message: "Loan has not been disbursed yet, and there are no funds to refund.",
                    statuscode: StatusCodes.OK,
                    data: response,
                    errors: null
                });
            }
        }

    } catch (error) {
        console.error("Error fetching loan account details:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal server error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = {
    getLoanAccountDetails
};
