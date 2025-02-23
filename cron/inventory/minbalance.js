const pg = require("../../db/pg");
const schedule = require("node-schedule");
const {sendEmail} = require("../../utils/sendEmail");

schedule.scheduleJob("0 0 * * *", async () => {
    await checkInventoryAndNotify();
});

async function checkInventoryAndNotify() {
    try {
        // Fetch all active inventory items
        const { rows: inventoryItems } = await pg.query(`
            SELECT * FROM divine."Inventory" WHERE status = 'ACTIVE'
        `);

        // Group by department
        const departmentGroups = inventoryItems.reduce((acc, item) => {
            if (!acc[item.department]) {
                acc[item.department] = [];
            }
            acc[item.department].push(item);
            return acc;
        }, {});

        for (const department in departmentGroups) {
            const items = departmentGroups[department];

            // Group by itemid and sum the qty
            const itemGroups = items.reduce((acc, item) => {
                if (!acc[item.itemid]) {
                    acc[item.itemid] = { qty: 0, items: [] };
                }
                acc[item.itemid].qty += item.qty || 0;
                acc[item.itemid].items.push(item);
                return acc;
            }, {});

            for (const itemid in itemGroups) {
                const { qty, items } = itemGroups[itemid];

                // Get the row with the highest id for the itemid
                const latestItem = items.reduce((max, item) => item.id > max.id ? item : max, items[0]);

                const { minimumbalance, reorderlevel, itemname } = latestItem;

                if (minimumbalance > 0 && qty <= minimumbalance) {
                    // Fetch department name
                    const { rows: [departmentData] } = await pg.query(`
                        SELECT department FROM divine."Department" WHERE id = $1
                    `, [department]);

                    const departmentname = departmentData.department;

                    // Compose and send email
                    const message = `
                        The item "${itemname}" (ID: ${itemid}) in the department "${departmentname}" has reached its minimum quantity.
                        Please remember that your set reorder quantity is ${reorderlevel}.
                    `;

                    await sendEmail({
                        to: 'divinehelpfarmers@gmail.com',
                        subject: `Inventory Alert for Department: ${departmentname}`,
                        text: message
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error checking inventory and sending notifications:', error);
    }
}


