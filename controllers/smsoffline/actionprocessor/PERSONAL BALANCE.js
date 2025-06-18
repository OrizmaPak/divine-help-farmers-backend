const { sendSmsOffline, sendSmsDnd, formatPhoneNumber } = require('../../../utils/sendSms');
const pg = require('../../../db/pg');
const { calculateBalance, calculateBalanceWithCurrency } = require('../../../utils/transactionHelper');

async function sendPersonalBalance(phone) {
    try {
        // Check if the phone number exists in the user table
        const userQuery = {
            text: `SELECT * FROM divine."User" WHERE phone = $1`,
            values: [phone]
        };
        const { rows: users } = await pg.query(userQuery);

        if (users.length === 0) {
            // If user does not exist, send a message about the user not being registered
            const message = "You are not registered. Please register to access your personal balance.\n To register, please send your details in the following format: 'REGISTER firstname lastname email'.";
            const result = await sendSmsOffline(phone, message);
            if (result) {
                console.log('User not registered message sent successfully');
            } else {
                console.error('Failed to send user not registered message');
            }
            return;
        }

        const user = users[0];
        const firstName = user.firstname;

        // Format the phone number using the user's country
        const formattedPhone = formatPhoneNumber(phone, user.country);

        // Get the personal_account_prefix from organisation settings
        const orgSettingsQuery = {
            text: `SELECT personal_account_prefix FROM divine."Organisationsettings" LIMIT 1`
        };
        const { rows: orgSettings } = await pg.query(orgSettingsQuery);
        const personalAccountPrefix = orgSettings[0].personal_account_prefix;

        // Concatenate the personal_account_prefix with the phone number
        const accountNumber = `${personalAccountPrefix}${phone}`;

        // Calculate the balance
        const balance = await calculateBalanceWithCurrency(accountNumber);

        console.log('balance', balance);

        // Format the balance message to include all currencies
        const balanceDetails = Object.entries(balance)
            .map(([currency, amount]) => `${currency} ${amount}`)
            .join(', ');

        // Send the balance over SMS
        const balanceMessage = `Hello ${firstName}, your PERSONAL balance is: ${balanceDetails}\n Powered By DIVINE HELP FARMERS`;
        const result = await sendSmsDnd(formattedPhone, balanceMessage);
        if (result) {
            console.log('Personal balance sent successfully');
        } else {
            console.error('Failed to send personal balance');
        } 
    } catch (error) {
        console.error('Error processing personal balance:', error);
    }
}

module.exports = { sendPersonalBalance };