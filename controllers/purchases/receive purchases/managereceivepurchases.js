// Import required modules
const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { v4: uuidv4 } = require('uuid');
const { activityMiddleware } = require("../../../middleware/activity");

// Function to handle opening stock request for multiple items
const manageReceivePurchases = async (req, res) => {
    // Extract rowsize from request body
    const rowsize = req.body.rowsize;
    if (!rowsize) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Rows size is required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: '',
            errors: ["Rows size is required"]  
        });
    }

    const reference = req.body.reference;

    // Extract user from request
    const user = req.user;

    try { 
        // Initialize an array to hold all the inventory items to be inserted
        const inventoryItems = [];

        if(reference){  
            await pg.query(
                `DELETE FROM divine."Inventory" WHERE reference = $1`,
                [reference]
            );
        };

        // Loop through each item based on rowsize
        for (let i = 1; i <= rowsize; i++) {
            // Extract id from request body
            const id = req.body[`id${i}`];
            // Query to select inventory item by id
            const inventory = await pg.query(`SELECT * FROM divine."Inventory" WHERE id = $1`, [id]);

            // Check if inventory item is not found
            if (!inventory.rows[0]) {
                // Return error response if inventory item not found
                return res.status(StatusCodes.OK).json({
                    status: false,
                    message: `Inventory item ${id} not found`,
                    statuscode: StatusCodes.OK,
                    data: '',
                    errors: [`Inventory item ${id} not found`]  
                });
            }



            // Clone the inventory item to modify its properties
            const clonedInventory = { ...inventory.rows[0] };

            // Update cloned inventory properties with request body values if provided
            clonedInventory.qty = req.body[`qty${i}`] || clonedInventory.qty;
            clonedInventory.cost = req.body[`cost${i}`] || clonedInventory.cost;
            clonedInventory.department = req.body[`department`] || clonedInventory.department;
            clonedInventory.branch = req.body[`branch`] || clonedInventory.branch;
            clonedInventory.transactiondate = req.body[`transactiondate${i}`] || new Date(); // Set transaction date to current date
            clonedInventory.transactiondesc = req.body[`transactiondesc${i}`] || ''; // Set transaction description
            clonedInventory.transactionref = req.body[`transactionref`] || ''; // Set transaction description
            clonedInventory.supplier = req.body[`supplier`] || ''; // Set transaction description
            clonedInventory.reference = reference.split('||')[0].replaceAll('PO', 'RP')+'||'+req.body['supplier'] || `RP-${new Date().getTime().toString()}||${req.body[`supplier`]}`; // Use provided reference or generate new one
            clonedInventory.createdby = user.id; // Set created by to the current user

            // Add the cloned inventory item to the array
            inventoryItems.push(clonedInventory);
        }

        // Insert cloned inventory items into the database
        for (const item of inventoryItems) {
            await pg.query(`INSERT INTO divine."Inventory" (
                itemid, itemname, department, branch, units, cost, price, pricetwo, 
                beginbalance, qty, minimumbalance, "group", applyto, itemclass, 
                composite, compositeid, description, imageone, imagetwo, imagethree, 
                status, "reference", transactiondate, transactiondesc, createdby, dateadded
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
            )`, [
                item.itemid, item.itemname, item.department, 
                item.branch, item.units, item.cost, 
                item.price, item.pricetwo, item.beginbalance, 
                item.qty, item.minimumbalance, item.group, 
                item.applyto, item.itemclass, item.composite, 
                item.compositeid, item.description, item.imageone, 
                item.imagetwo, item.imagethree, 'ACTIVE', 
                item.reference, item.transactiondate, item.transactiondesc, 
                item.createdby, new Date()
            ]);

            // Log activity for opening stock
            // Get the department from the department table
            const { rows: department } = await pg.query(`SELECT department FROM divine."Department" WHERE id = $1`, [item.department]);
            // Get the branch from the branch table
            const { rows: branch } = await pg.query(`SELECT branch FROM divine."Branch" WHERE id = $1`, [item.branch]);
            // Log activity for opening stock
            await activityMiddleware(res, req.user.id, `Opening stock added for item ${item.itemname} in department ${department[0].department} and branch ${branch[0].branch} with quantity ${item.qty}`, 'OPEN STOCK');
        }

        // HANDLE TRANSACTIONS
        // GET TOTAL VALUE OF ITEMS
        const totalValue = inventoryItems.reduce((acc, item) => acc + item.qty * item.cost, 0);
        // get the supplier
        const supplier = (await pg.query(`SELECT * FROM divine."Supplier" WHERE supplier = $1`, [req.body['supplier']])).rows[0];
        // get the organisation settings
        const orgSettings = (await pg.query(`SELECT * FROM divine."Organisationsettings" LIMIT 1`)).rows[0];

        const reqbody = req.body;

        // SUBMIT IT AS AN EXPECTED TRANSACTION
        const transactionData1 = {
            accountnumber: `${orgSettings.personal_account_prefix}${supplier.contactpersonphone}`,
            credit,
            debit: totalValue,
            reference,
            transactiondate: new Date(),
            transactiondesc: '',
            currency: supplier.currency,
            description: reqbody.reference,
            branch: '',
            registrationpoint: '',
            ttype: 'DEBIT',
            tfrom: 'BANK',
            tax: false,
        };

        await saveTransactionMiddleware({ ...req, body: transactionData1 }, res, (data) => {return});

        const transactionData2 = {
            accountnumber: `${orgSettings.personal_account_prefix}${supplier.contactpersonphone}`,
            credit: reqbody.amountpaid,
            debit,
            reference,
            transactiondate: new Date(),
            transactiondesc: '',
            currency: supplier.currency,
            description: reqbody.reference,
            branch: '',
            registrationpoint: '',
            ttype: 'CREDIT',
            tfrom: 'BANK',
            tax: false,
        };

        await saveTransactionMiddleware({ ...req, body: transactionData2 }, res, (data) => {return});

        
        // Return success response with the inserted inventory items
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Opening stock added successfully",
            statuscode: StatusCodes.OK,
            data: inventoryItems,
            errors: []  
        });
    } catch (error) {
        // Log error if any occurs
        console.error(error);
        // Return error response if an internal server error occurs
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal Server Error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: '',
            errors: []  
        });
    }
};

// Export the manageReceivePurchases function
module.exports = {manageReceivePurchases};
