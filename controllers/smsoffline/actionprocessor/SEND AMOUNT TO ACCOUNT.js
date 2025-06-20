const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { sendSmsOffline } = require("../../../utils/sendSms");
const { calculateBalance } = require("../../../utils/transactionHelper");

async function processSendAmountToAccount( phone, amount, accountNumber) {
    try {
        // Check if the user exists using the phone number
        const userQuery = {
            text: `SELECT id, pin FROM divine."User" WHERE phone = $1`,
            values: [phone]
        };
        const { rows: users } = await pg.query(userQuery);

        if (users.length === 0) {
            // If user does not exist, send a message about the user not being registered
            const message = "You are not registered. Please register to access your account information.";
            const result = await sendSmsOffline(phone, message);
            if (result) {
                console.log('User not registered message sent successfully');
            } else {
                console.error('Failed to send user not registered message');
            }
            return;
        }

        const user = users[0];
        const userId = user.id;

        // Fetch personal account prefix from organisation settings
        const orgSettingsQuery = {
            text: `SELECT personal_account_prefix FROM divine."Organisationsettings" WHERE id = 1`,
            values: []
        };
        const { rows: orgSettings } = await pg.query(orgSettingsQuery);
        const personalAccountPrefix = orgSettings.length > 0 ? orgSettings[0].personal_account_prefix : '';
        
        // Construct personal account number
        const personalAccountNumber = `${personalAccountPrefix}${phone}`;
        
        // Calculate balance using the calculateBalance function
        const balance = await calculateBalance(personalAccountNumber);
        console.log('balance', balance);

        if (balance < (Number(amount) + 100)) {
            const message = "Insufficient funds in your personal account.";
            await sendSmsOffline(phone, message);
            return;
        }

        // Check if the account number exists for the user in the savings table
        const accountQuery = {
            text: `SELECT id, savingsproductid FROM divine."savings" WHERE accountnumber = $1 AND userid = $2`,
            values: [accountNumber, userId]
        };
        const { rows: accounts } = await pg.query(accountQuery);

        if (accounts.length === 0) {
            const message = "You do not have an account with that account number.";
            await sendSmsOffline(phone, message);
            return;
        }

        const savingsProductId = accounts[0].savingsproductid;

        // Get the product name using the savingsproductid
        const productQuery = {
            text: `SELECT productname FROM divine."savingsproduct" WHERE id = $1`,
            values: [savingsProductId]
        };
        const { rows: products } = await pg.query(productQuery);

        const productName = products.length > 0 ? products[0].productname : 'Unknown Product';

        // Check if the user has a PIN set up
        if (!user.pin) {
            const message = "You don't have a PIN. Please send 'I want to create my PIN' to set it up.";
            await sendSmsOffline(phone, message);
            return;
        }

        // Determine the account type
        let accountType = 'SAVINGS'; // Default to SAVINGS since the account is found in the savings table

        // Create a transaction and save it in pendingofflinetransaction
         const transactionQuery = {
            text: `INSERT INTO divine."pendingofflinetransaction" (phone, amount, accountnumberfrom, productfrom, accountnumberto, productto, description, accounttypefrom, accounttypeto, status, createdby) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            values: [phone, amount, personalAccountNumber, '', accountNumber, productName, 'Offline Transaction', 'PERSONAL', accountType, 'ACTIVE', userId]
        };
        const { rows: transactions } = await pg.query(transactionQuery);

        if (transactions.length > 0) {
            const message = "TO COMPLETE TRANSACTION, enter your PIN within 1 min. Delete your PIN from the message for security.";
            await sendSmsOffline(phone, message);
        } else {
            const message = "Failed to create transaction.";
            await sendSmsOffline(phone, message);
        }
    } catch (error) {
        console.error('Error processing send amount to account:', error);
    }
}

module.exports = { processSendAmountToAccount };