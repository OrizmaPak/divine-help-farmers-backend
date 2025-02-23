const schedule = require('node-schedule');
const pg = require('../../db/pg');
const sendEmail = require('../../utils/sendEmail'); // Assuming there's a utility to send emails

const generateReferralReport = async () => {
    try {
        // Get the current date
        const currentDate = new Date();

        // Calculate the start of the week (Sunday)
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

        // Calculate the start of the month
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        // Calculate the start of the year
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

        // Query to count users who joined this week
        const { rows: weekCount } = await pg.query(`
            SELECT COUNT(*) FROM divine."User" WHERE dateadded >= $1
        `, [startOfWeek]);

        // Query to count users who joined this month
        const { rows: monthCount } = await pg.query(`
            SELECT COUNT(*) FROM divine."User" WHERE dateadded >= $1
        `, [startOfMonth]);

        // Query to count users who joined this year
        const { rows: yearCount } = await pg.query(`
            SELECT COUNT(*) FROM divine."User" WHERE dateadded >= $1
        `, [startOfYear]);

        // Compose the report
        const report = `
            Weekly Report: ${weekCount[0].count} users joined this week.
            Monthly Report: ${monthCount[0].count} users joined this month so far.
            Yearly Report: ${yearCount[0].count} users joined this year so far as well.
        `;

        // Send the report via email
        await sendEmail({
            to: 'divinehelpfarmers@gmail.com',
            subject: 'Member Report',
            text: report,
            html: `<pre>${report}</pre>`
        });

        console.log('Referral report sent successfully.');
    } catch (error) {
        console.error('Error generating referral report:', error);
    }
};

// Schedule the job to run every Saturday at 12am
schedule.scheduleJob('0 0 * * 6', generateReferralReport);
