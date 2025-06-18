const { sendSmsDnd, sendSmsOffline, formatPhoneNumber } = require('../../../utils/sendSms');
const pg = require('../../../db/pg');
const { calculateBalance } = require('../../../utils/transactionHelper');
const { formatNumber } = require('../../../utils/sanitizer');

async function sendTotalAsset(phone) {
    try {
        // Check if the phone number exists in the user table
        const userQuery = {
            text: `SELECT * FROM divine."User" WHERE phone = $1`,
            values: [phone]
        };
        const { rows: users } = await pg.query(userQuery);

        if (users.length === 0) {
            // If user does not exist, send a message about the user not being registered
            const message = "You are not registered. Please register to access your total asset.";
            const result = await sendSmsOffline(phone, message);
            if (result) {
                console.log('User not registered message sent successfully');
            } else {
                console.error('Failed to send user not registered message');
            }
            return;
        }

        const user = users[0];
        const firstName = user.firstname; // Get the user's first name

        // Get all products where meetingviewable is 'YES'
        const productQuery = {
            text: `SELECT id, productname, currency FROM divine."savingsproduct" WHERE meetingviewable = 'YES'`
        };
        const { rows: products } = await pg.query(productQuery);

        if (products.length === 0) {
            // If no products are viewable, send a message
            const message = "No viewable products found.";
            const result = await sendSmsOffline(phone, message);
            if (result) {
                console.log('No viewable products message sent successfully');
            } else {
                console.error('Failed to send no viewable products message');
            }
            return;
        }

        let totalAssets = {};
        let productDetails = '';

        // Iterate over each product to get accounts and calculate total asset
        for (const product of products) {
            const savingsQuery = {
                text: `SELECT accountnumber FROM divine."savings" WHERE userid = $1 AND savingsproductid = $2`,
                values: [user.id, product.id]
            };
            const { rows: accounts } = await pg.query(savingsQuery);

            let productTotal = {};
            for (const account of accounts) {
                // Calculate the balance for each account
                const balance = await calculateBalance(account.accountnumber);
                const currency = product.currency;

                if (!productTotal[currency]) {
                    productTotal[currency] = 0;
                }
                productTotal[currency] += balance;

                if (!totalAssets[currency]) {
                    totalAssets[currency] = 0;
                }
                totalAssets[currency] += balance;
            }

            for (const [currency, amount] of Object.entries(productTotal)) {
                if (amount > 0) {
                    productDetails += `Product: ${product.productname}, Bal: ${formatNumber(amount)} ${currency}\n`;
                }
            }
        }

        let totalAssetMessage = '';
        for (const [currency, amount] of Object.entries(totalAssets)) {
            totalAssetMessage += `Total Asset in ${currency}: ${formatNumber(amount)}\n`;
        }

        // Send the total asset and product details over SMS
        const assetMessage = `Hello ${firstName}, your total assets are:\n${totalAssetMessage}${productDetails}Powered by DIVINE HELP FARMERS`;
        const formattedPhone = formatPhoneNumber(phone, user.country || 'nigeria');
        const result = await sendSmsDnd(formattedPhone, assetMessage);
        if (result) {
            console.log('Total asset and product details sent successfully');
        } else {
            console.error('Failed to send total asset and product details');
        }
    } catch (error) {
        console.error('Error processing total asset:', error);
    }
}

module.exports = { sendTotalAsset };