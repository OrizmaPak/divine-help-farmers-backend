const pg = require("../../../db/pg");
const { sendSmsOffline, sendSmsDnd } = require("../../../utils/sendSms");

async function getAccountNumbers(phone) {
    try {
        // Fetch user using phone number
        const userQuery = {
            text: `SELECT id, firstname, bank_name, account_number, account_name FROM divine."User" WHERE phone = $1`,
            values: [phone]
        };
        const { rows: users } = await pg.query(userQuery);

        if (users.length === 0) {
            const message = "User not found. Please register to access your account information.";
            await sendSmsOffline(phone, message);
            return;
        }

        const user = users[0];
        const userId = user.id;

        // Fetch all accounts for the user
        const accountsQuery = {
            text: `SELECT accountnumber, savingsproductid FROM divine."savings" WHERE userid = $1`,
            values: [userId]
        };
        const { rows: accounts } = await pg.query(accountsQuery);

        if (accounts.length === 0) {
            const message = "No accounts found for this user.";
            await sendSmsOffline(phone, message);
            return;
        }

        // Fetch product names using savingsproductid
        const productIds = accounts.map(account => account.savingsproductid);
        const productQuery = {
            text: `SELECT id, productname FROM divine."savingsproduct" WHERE id = ANY($1)`,
            values: [productIds]
        };
        const { rows: products } = await pg.query(productQuery);

        // Map product IDs to product names
        const productMap = products.reduce((map, product) => {
            map[product.id] = product.productname;
            return map;
        }, {});

        // Construct the compact message with account details
        let message = `Hi ${user.firstname}\n Bank: ${user.bank_name}, Acc#: ${user.account_number}\n Accounts: `;
        accounts.forEach(account => {
            const productName = productMap[account.savingsproductid] || 'Unknown Product';
            message += `${account.accountnumber} (${productName}), `;
        });
        message = message.slice(0, -2); // Remove trailing comma and space
        message += `\n Powered by DIVINE HELP FARMERS`;

        // Send the account details via SMS
        await sendSmsDnd(phone, message);
    } catch (error) {
        console.error('Error fetching account numbers:', error);
    }
}

module.exports = { getAccountNumbers };