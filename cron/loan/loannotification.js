const schedule = require('node-schedule');

schedule.scheduleJob('0 0 * * *', async () => { // This will run every day at midnight
    try {
        // Fetch all active loan accounts
        const accountsQuery = {
            text: `SELECT * FROM divine."loanaccounts" WHERE status = 'ACTIVE'`,
            values: []
        };
        const accountsResult = await pg.query(accountsQuery);
        const accounts = accountsResult.rows;

        const today = new Date();
        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(today.getDate() + 10);

        for (const account of accounts) {
            const { accountnumber, userid } = account;

            // Fetch loan payment schedule for the account
            const installmentsQuery = {
                text: `SELECT * FROM divine."loanpaymentschedule" WHERE accountnumber = $1`,
                values: [accountnumber]
            };
            const installmentsResult = await pg.query(installmentsQuery);
            const installments = installmentsResult.rows;

            // Fetch all active transactions for the account
            const transactionsQuery = {
                text: `SELECT * FROM divine."transaction" WHERE accountnumber = $1 AND status = 'ACTIVE'`,
                values: [accountnumber]
            };
            const transactionsResult = await pg.query(transactionsQuery);
            const transactions = transactionsResult.rows;

            let totalBalancePaid = 0;

            // Calculate total balance paid based on transactions
            transactions.forEach(transaction => {
                totalBalancePaid += parseFloat(transaction.credit) - parseFloat(transaction.debit);
            });

            // Determine payment status for each installment
            installments.forEach(installment => {
                const amountToBePaid = parseFloat(installment.scheduleamount) + parseFloat(installment.interestamount);
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

            for (const installment of installments) {
                if (installment.paymentstatus !== 'FULLY PAID') {
                    const dueDate = new Date(installment.scheduledpaymentdate);

                    // Check if installment is due within the next 10 days
                    if (dueDate <= tenDaysFromNow && dueDate >= today) {
                        // Fetch user email
                        const userQuery = {
                            text: `SELECT email, firstname FROM divine."users" WHERE id = $1`,
                            values: [userid]
                        };
                        const userResult = await pg.query(userQuery);
                        const user = userResult.rows[0];

                        if (user && user.email) {
                            // Send reminder email
                            const emailSubject = 'Upcoming Loan Installment Due';
                            const emailBody = `Dear ${user.firstname},

This is a reminder that your loan installment for account number ${accountnumber} is due on ${dueDate.toDateString()}. Please ensure timely payment to avoid penalties and maintain a good credit score.

Thank you.`;

                            // Replace with your actual email sending function
                            await sendEmail(user.email, emailSubject, emailBody);
                        }

                        // Create notification
                        const notificationQuery = {
                            text: `INSERT INTO divine."notification" (userid, title, description, dateadded, createdby, status, location) VALUES ($1, $2, $3, NOW(), $4, 'ACTIVE', $5)`,
                            values: [
                                userid,
                                'Loan Installment Due Soon',
                                `Your loan installment for account number ${accountnumber} is due on ${dueDate.toDateString()}. Please make the payment to avoid penalties and maintain a good credit score.`,
                                0,
                                'loanaccount'
                            ]
                        };
                        await pg.query(notificationQuery);
                    }

                    // Check if installment is overdue
                    else if (dueDate < today) {
                        // Fetch user email
                        const userQuery = {
                            text: `SELECT email, firstname FROM divine."users" WHERE id = $1`,
                            values: [userid]
                        };
                        const userResult = await pg.query(userQuery);
                        const user = userResult.rows[0];

                        if (user && user.email) {
                            // Send overdue email
                            const emailSubject = 'Overdue Loan Installment Notice';
                            const emailBody = `Dear ${user.firstname},

Our records indicate that your loan installment for account number ${accountnumber} was due on ${dueDate.toDateString()} and is still unpaid. Please make the payment immediately to avoid additional penalties and negative impacts on your credit score.

Thank you.`;

                            // Replace with your actual email sending function
                            await sendEmail(user.email, emailSubject, emailBody);
                        }

                        // Create overdue notification
                        const notificationQuery = {
                            text: `INSERT INTO divine."notification" (userid, title, description, dateadded, createdby, status) VALUES ($1, $2, $3, NOW(), $4, 'ACTIVE')`,
                            values: [
                                userid,
                                'Loan Installment Overdue',
                                `Your loan installment for account number ${accountnumber} was due on ${dueDate.toDateString()} and is still unpaid. Please make the payment immediately to avoid additional penalties and negative impacts on your credit score.`,
                                0 // Assuming '0' represents the system or admin user
                            ]
                        };
                        await pg.query(notificationQuery);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in loan notification cron job:', error);
    }
});
