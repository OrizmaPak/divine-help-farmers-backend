const schedule = require('node-schedule');

schedule.scheduleJob('0 12 * * *', async () => { // This will run every day at 12:00 PM
    try {
        // Fetch all loan accounts without a disbursement reference
        const accountsQuery = {
            text: `SELECT * FROM divine."loanaccounts" WHERE disbursementref IS NULL OR disbursementref = ''`,
            values: []
        };
        const accountsResult = await pg.query(accountsQuery);
        const accounts = accountsResult.rows;

        for (const account of accounts) {
            const { accountnumber, loanproduct } = account;

            // Fetch product officer email using the loan product ID
            const productQuery = {
                text: `SELECT email, firstname FROM divine."users" WHERE id = (SELECT productofficer FROM divine."loanproduct" WHERE id = $1)`,
                values: [loanproduct]
            };
            const productResult = await pg.query(productQuery);
            const productOfficer = productResult.rows[0];

            if (productOfficer && productOfficer.email) {
                // Send email to the product officer
                const emailSubject = 'Loan Account Disbursement Pending';
                const emailBody = `Dear ${productOfficer.firstname},

The loan account with account number ${accountnumber} does not have a disbursement reference. Please take the necessary actions to update the account details.

Thank you.`;

                // Replace with your actual email sending function
                await sendEmail(productOfficer.email, emailSubject, emailBody);
            }
        }
    } catch (error) {
        console.error('Error in disbursement notification cron job:', error);
    }
});

