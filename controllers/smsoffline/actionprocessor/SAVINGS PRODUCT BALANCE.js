const { sendSmsDnd, sendSmsOffline, formatPhoneNumber } = require('../../../utils/sendSms');
const pg = require('../../../db/pg');
const { maskValue, formatNumber } = require('../../../utils/sanitizer');
const { calculateBalanceWithCurrency, calculateBalance } = require('../../../utils/transactionHelper');

async function sendSavingsProductBalance(phone, product) {
    try {
        // Check if the phone number exists in the user table
        const userQuery = {
            text: `SELECT * FROM divine."User" WHERE phone = $1`,
            values: [phone]
        }; 
        const { rows: users } = await pg.query(userQuery);

        if (users.length === 0) {
            // If user does not exist, send a message about the user not being registered
            const message = "You are not registered. Please register to access your savings product balance.";
            const result = await sendSmsOffline(phone, message);
            if (result) {
                console.log('User not registered message sent successfully');
            } else {
                console.error('Failed to send user not registered message');
            }
            return;
        }

        const user = users[0];
        const userName = user.firstname; // Assuming the user's first name is stored in the 'firstname' field

        // Format the phone number using the user's country
        const formattedPhone = formatPhoneNumber(phone, user.country);

        // Check the savings product for productname == product
        const productQuery = {
            text: `SELECT id, currency FROM divine."savingsproduct" WHERE productname = $1`,
            values: [product]
        };
        const { rows: products } = await pg.query(productQuery);

        if (products.length === 0) {
            // If product does not exist, send a message about the product not being found
            const message = `The product "${product}" does not exist.`;
            const result = await sendSmsOffline(phone, message);
            if (result) {
                console.log('Product not found message sent successfully');
            } else {
                console.error('Failed to send product not found message');
            }
            return;
        }

        const productId = products[0].id;
        const currency = products[0].currency;

        // Check the savings table for accounts by user id and product id
        const savingsQuery = {
            text: `SELECT accountnumber, member FROM divine."savings" WHERE userid = $1 AND savingsproductid = $2`,
            values: [user.id, productId]
        };
        const { rows: accounts } = await pg.query(savingsQuery);

        if (accounts.length === 0) {
            // If no account found, send a message about no accounts being found
            const message = `No savings account found for the product "${product}".`;
            const result = await sendSmsOffline(phone, message);
            if (result) {
                console.log('No account found message sent successfully');
            } else {
                console.error('Failed to send no account found message');
            }
            return;
        }

        // Compose a message with account details
        let accountDetails = `Hi ${userName}, savings for "${product}":\n`;
        for (const account of accounts) {
            const memberQuery = {
                text: `SELECT * FROM divine."DefineMember" WHERE id = $1`,
                values: [account.member]
            };
            const { rows: members } = await pg.query(memberQuery);
            const member = members[0];

            // Calculate the balance for each account
            const balance = await calculateBalance(account.accountnumber);

            const maskedAccountNumber = maskValue(account.accountnumber);
            const memberName = member.member.length > 18 ? member.member.substring(0, 16) + '..' : member.member;
            accountDetails += `Acct: ${maskedAccountNumber}\nMember: ${memberName}\nBalance: ${currency} ${formatNumber(balance)}\n`;
        }
        accountDetails += "Powered by DIVINE HELP FARMERS";

        // Send the account details over SMS
        const result = await sendSmsDnd(formattedPhone, accountDetails);
        if (result) {
            console.log('Savings product balance sent successfully');
        } else {
            console.error('Failed to send savings product balance');
        }
    } catch (error) {
        console.error('Error processing savings product balance:', error);
    }
}

module.exports = { sendSavingsProductBalance };