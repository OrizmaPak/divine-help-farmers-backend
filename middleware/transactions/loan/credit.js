const { makePaymentAndCloseAccount, handleCreditRedirectToPersonnalAccount, saveTransaction } = require("../../../utils/transactionHelper");

const loanCredit = async (client, req, res, next, loanAccountNumber, credit, description, ttype, transactionStatus,  ) => {
    try {
        await applyMinimumCreditAmountPenalty(client, req, res, req.orgSettings);

        const loanAccount = req.body.loanaccount;

        if(!loanAccount.disbursementref){
            await handleCreditRedirectToPersonalAccount(client, req, res, next, loanAccountNumber, credit, "No recorded disbursement on this account", ttype, transactionStatus, whichaccount);
            await client.query('COMMIT');
            return next();
        }
        // Begin transaction

        // Check if the loan account is closed
        if (loanAccount.dateclosed) {
            // Redirect the credit to personal account using helper function
            await handleCreditRedirectToPersonalAccount(client, req, res, next, loanAccountNumber, credit, description, ttype, transactionStatus, whichaccount);
            await client.query('COMMIT');
            return next();
        }

        // Get all the installments of the loan
        const getInstallmentsQuery = {
            text: `SELECT * FROM divine."loanpaymentschedule" WHERE accountnumber = $1 ORDER BY scheduledpaymentdate ASC`,
            values: [loanAccountNumber]
        };
        const installmentsResult = await client.query(getInstallmentsQuery);
        const installments = installmentsResult.rows;

        // Calculate the total amount left for repayment
        let totalAmountLeft = 0;
        let totalamount = 0
        for (const installment of installments) {
            const { scheduleamount, interestamount, paymentstatus, remainingbalance } = installment;
            const totalInstallment = scheduleamount + interestamount;
            totalamount += totalInstallment;
            if (paymentstatus === 'FULLY PAID') {
                continue;
            } else if (paymentstatus === 'PARTLY PAID') {
                totalAmountLeft += remainingbalance;
            } else {
                totalAmountLeft += totalInstallment;
            }
        }

        req.body.totalamount = totalamount

        if (totalAmountLeft > credit) {
            // Save the transaction using helper function
            req.body.whichaccount = 'LOAN'
            await saveTransaction(client, res, {
                accountnumber: loanAccountNumber,
                credit,
                debit: 0,
                description,
                ttype,
                status: 'ACTIVE',
                transactiondesc: 'Loan credit transaction',
                whichaccount: req.body.whichaccount
            }, req);
        } else if (totalAmountLeft == credit) {
            // Make the payment and close the account using helper function
            await makePaymentAndCloseAccount(client, loanAccountNumber, credit, description, ttype, transactionStatus, loanAccount);
        } else if (totalAmountLeft < credit) {
            const amountToComplete = totalAmountLeft;
            const excessCredit = credit - amountToComplete;
            
            // Make partial payment and close the account
            await makePaymentAndCloseAccount(client, loanAccountNumber, amountToComplete, description, ttype, transactionStatus, loanAccount);

            // Redirect the excess credit to personal account
            await handleCreditRedirectToPersonnalAccount(client, req, res, next, loanAccountNumber, excessCredit, description, ttype, transactionStatus, 'PERSONAL');
        }

        // Commit transaction
        await client.query('COMMIT');
        // return next();

        // return res.status(200).json({
        //     status: true,
        //     message: "Loan credited successfully",
        //     statuscode: 200,
        //     data: {
        //         accountnumber: loanAccountNumber,
        //         newBalance: loanAccount.balance + credit
        //     },
        //     errors: null
        // });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error crediting loan account:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            statuscode: 500,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = {
    loanCredit
};
