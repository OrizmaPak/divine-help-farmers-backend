const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { sendSmsOffline } = require("../../../utils/sendSms");
const { calculateBalance } = require("../../../utils/transactionHelper");

async function processSendAmountFromAccountToAccount(phone, amount, accountNumberFrom, accountNumberTo) {
    try {
        // Check if the user exists using the phone number
        const userQuery = {
            text: `SELECT id, pin FROM divine."User" WHERE phone = $1`,
            values: [phone]
        };
        const { rows: users } = await pg.query(userQuery);

        if (users.length === 0) {
            const message = "You are not registered. Please register to access your account information.";
            await sendSmsOffline(phone, message);
            return;
        }

        const user = users[0];
        const userId = user.id;

        // Fetch account prefixes from organisation settings
        const orgSettingsQuery = {
            text: `SELECT personal_account_prefix, savings_account_prefix, loan_account_prefix, rotary_account_prefix, property_account_prefix FROM divine."Organisationsettings" WHERE id = 1`,
            values: []
        };
        const { rows: orgSettings } = await pg.query(orgSettingsQuery);
        const prefixes = orgSettings[0];

        // Determine the account type based on the prefix
        let accountTypeFrom = '';
        if (accountNumberFrom.startsWith(prefixes.personal_account_prefix)) {
            accountTypeFrom = 'PERSONAL';
        } else if (accountNumberFrom.startsWith(prefixes.savings_account_prefix)) {
            accountTypeFrom = 'SAVINGS';
        } else if (accountNumberFrom.startsWith(prefixes.loan_account_prefix)) {
            accountTypeFrom = 'LOAN';
        } else if (accountNumberFrom.startsWith(prefixes.rotary_account_prefix)) {
            accountTypeFrom = 'ROTARY';
        } else if (accountNumberFrom.startsWith(prefixes.property_account_prefix)) {
            accountTypeFrom = 'PROPERTY';
        } else {
            const message = "Invalid account number.";
            await sendSmsOffline(phone, message);
            return;
        }

        // Calculate balance using the calculateBalance function
        const balance = await calculateBalance(accountNumberFrom);
        if (balance < (Number(amount) + 100)) {
            const message = "Insufficient funds in your account.";
            await sendSmsOffline(phone, message);
            return;
        }

        // Check if the destination account number exists for the user in the savings table
        const accountQuery = {
            text: `SELECT id, savingsproductid FROM divine."savings" WHERE accountnumber = $1 AND userid = $2`,
            values: [accountNumberTo, userId]
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

        // Create a transaction and save it in pendingofflinetransaction
        const transactionQuery = {
            text: `INSERT INTO divine."pendingofflinetransaction" (phone, amount, accountnumberfrom, productfrom, accountnumberto, productto, description, accounttypefrom, accounttypeto, status, createdby) VALUES ($1, $2, $3, '', $4, $5, 'Offline Transaction', $6, 'SAVINGS', 'ACTIVE', $7) RETURNING id`,
            values: [phone, amount, accountNumberFrom, accountNumberTo, productName, accountTypeFrom, userId]
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
        console.error('Error processing send amount from account to account:', error);
    }
}

module.exports = { processSendAmountFromAccountToAccount };