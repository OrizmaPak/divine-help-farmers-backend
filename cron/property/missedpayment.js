const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");
const { activityMiddleware } = require("../../middleware/activity");
const { sendEmail } = require("../../utils/emailService");
const { sendNotification } = require("../../utils/notificationService");

async function checkAndNotifyMissedPayments() {
    try {
        // Fetch all active property accounts
        const propertyAccountQuery = `
            SELECT 
                pa.accountnumber,
                pa.userid,
                u.email
            FROM divine."propertyaccount" pa
            JOIN divine."User" u ON pa.userid = u.id
            WHERE pa.status = 'ACTIVE'
        `;
        const { rows: accountRows } = await pg.query(propertyAccountQuery);

        const today = new Date();
        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(today.getDate() + 10);

        for (const account of accountRows) {
            const { accountnumber, userid, email } = account;

            // Fetch installments for the account
            const installmentsQuery = {
                text: `
                    SELECT 
                        id,
                        duedate,
                        amount,
                        delivered
                    FROM divine."propertyinstallments"
                    WHERE accountnumber = $1 AND status = 'ACTIVE'
                    ORDER BY duedate ASC
                `,
                values: [accountnumber]
            };
            const { rows: installmentRows } = await pg.query(installmentsQuery);

            // Fetch all transactions for this account
            const transactionsQuery = {
                text: `
                    SELECT 
                        id, 
                        credit,
                        debit,
                        transactionref, 
                        dateadded
                    FROM divine."transaction"
                    WHERE accountnumber = $1
                    ORDER BY dateadded ASC
                `,
                values: [accountnumber]
            };
            const { rows: allTransactions } = await pg.query(transactionsQuery);

            // Separate credits and debits
            let creditTxs = allTransactions
                .filter((tx) => tx.credit != 0)
                .map((tx) => ({
                    ...tx,
                    remainingAmount: Number(tx.credit)
                }));

            const debitTxs = allTransactions
                .filter((tx) => tx.debit != 0)
                .map((tx) => ({ ...tx, amount: Number(tx.debit) }));

            // Apply debits to earliest credits
            for (const debit of debitTxs) {
                let debitRemaining = debit.debit;
                for (const cred of creditTxs) {
                    if (debitRemaining <= 0) break;
                    if (cred.remainingAmount > 0) {
                        const toReduce = Math.min(cred.remainingAmount, debitRemaining);
                        cred.remainingAmount -= toReduce;
                        debitRemaining -= toReduce;
                    }
                }
            }

            // Allocate leftover credit to installments
            let creditPointer = 0;
            while (creditPointer < creditTxs.length && installmentRows.some((inst) => inst.amountowed > 0)) {
                if (creditTxs[creditPointer].remainingAmount <= 0) {
                    creditPointer++;
                    continue;
                }

                const currentCreditTx = creditTxs[creditPointer];
                const nextUnpaidInstallment = installmentRows.find((inst) => inst.amountowed > 0);
                if (!nextUnpaidInstallment) break;

                const allocation = Math.min(
                    currentCreditTx.remainingAmount,
                    nextUnpaidInstallment.amountowed
                );

                nextUnpaidInstallment.amountpaid += allocation;
                nextUnpaidInstallment.amountowed -= allocation;
                if (nextUnpaidInstallment.amountowed === 0) {
                    nextUnpaidInstallment.paymentstatus = "PAID";
                } else if (nextUnpaidInstallment.amountowed < (nextUnpaidInstallment.amount || 0)) {
                    nextUnpaidInstallment.paymentstatus = "PARTLY PAID";
                }
                nextUnpaidInstallment.transactionrefs.push({
                    transactionref: currentCreditTx.transactionref,
                    allocated: allocation
                });

                currentCreditTx.remainingAmount -= allocation;
            }

            for (const installment of installmentRows) {
                const { duedate, amount, delivered } = installment;
                const dueDate = new Date(duedate);

                if (dueDate < today && delivered === 'NO') {
                    const message = `Your installment of amount ${amount} for account number ${accountnumber} is past due. Please make the payment as soon as possible.`;
                    await sendEmail(email, "Past Due Installment Notification", message);
                    await sendEmail("divinehelpfarmers@gmail.com", "Past Due Installment Notification", message);
                    await sendNotification(userid, message);
                } else if (dueDate >= today && dueDate <= tenDaysFromNow && delivered === 'NO') {
                    const message = `You have an upcoming installment of amount ${amount} for account number ${accountnumber} due on ${dueDate.toDateString()}. Please ensure timely payment.`;
                    await sendEmail(email, "Upcoming Installment Notification", message);
                    await sendEmail("divinehelpfarmers@gmail.com", "Upcoming Installment Notification", message);
                    await sendNotification(userid, message);
                }
            }
        }

        await activityMiddleware(null, null, 'Checked and notified users for missed and upcoming payments', 'CRON_JOB');
    } catch (error) {
        console.error("Error in Missed Payment Notification Cron Job:", error);
        await activityMiddleware(null, null, 'Error occurred in missed payment notification cron job', 'CRON_JOB_ERROR');
    }
}

checkAndNotifyMissedPayments();

