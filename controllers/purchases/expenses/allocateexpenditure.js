const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");
const performTransaction = require("../../middleware/transactions/performTransaction");
const { activityMiddleware } = require("../../middleware/activity");

const allocateExpenditure = async (req, res) => {
    try {
        const { userid, amount, description } = req.body;

        // Validate input
        if (!userid || !amount) {
            await activityMiddleware(req, 0, 'Validation failed: User ID and amount are required', 'EXPENDITURE_ALLOCATION');
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "User ID and amount are required",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Fetch organization settings
        const orgSettingsQuery = `SELECT * FROM divine."Organisationsettings"`;
        const orgSettingsResult = await pg.query(orgSettingsQuery, [userid]);

        if (orgSettingsResult.rows.length === 0) {
            await activityMiddleware(req, 0, 'Organization settings not found for the user', 'EXPENDITURE_ALLOCATION');
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Organization settings not found for the user",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const orgSettings = orgSettingsResult.rows[0];

        // Calculate balance of the default_expense_account
        const balanceQuery = `
            SELECT 
                COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) AS balance 
            FROM divine."transactions" 
            WHERE accountnumber = $1
        `;
        const balanceResult = await pg.query(balanceQuery, [orgSettings.default_expense_account]);

        if (balanceResult.rows.length === 0 || balanceResult.rows[0].balance < amount) {
            await activityMiddleware(req, 0, 'Insufficient funds in the expense account', 'EXPENDITURE_ALLOCATION');
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Insufficient funds in the expense account",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Fetch user details
        const userQuery = `
            SELECT firstname, lastname, othernames 
            FROM divine."User" 
            WHERE id = $1
        `;
        const userResult = await pg.query(userQuery, [userid]);

        if (userResult.rows.length === 0) {
            await activityMiddleware(req, 0, 'User not found', 'EXPENDITURE_ALLOCATION');
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "User not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const { firstname, lastname, othernames } = userResult.rows[0];
        const fullName = `${firstname} ${othernames ? othernames + ' ' : ''}${lastname}`;

        // Prepare transactions
        const fromTransaction = {
            accountnumber: `${orgSettings.default_expense_account}`,
            credit: 0,
            debit: amount,
            reference,
            transactiondate: new Date(),
            transactiondesc: '',
            currency: 'NGN', 
            description: "Debit for expenditure allocation for "+description,
            branch: '',
            registrationpoint: '',
            ttype: 'DEBIT',
            tfrom: 'BANK',
            tax: false,
        };

        const toTransaction = {
            accountnumber: `${orgSettings.default_allocation_account}`,
            credit: amount,
            debit: 0,
            reference,
            transactiondate: new Date(),
            transactiondesc: '',
            currency: 'NGN',
            description: "Credit for expenditure allocated to "+fullName+"("+userid+")"+" for "+description,
            branch: '',
            registrationpoint: '',
            ttype: 'CREDIT',
            tfrom: 'BANK',
            tax: false,
        };

        // Log the transaction attempt in the activity
        await activityMiddleware(req, 0, 'Attempting to allocate expenditure', 'EXPENDITURE_ALLOCATION');

        // Perform the transaction
        const transactionResult = await performTransaction(fromTransaction, toTransaction, 0, userid);

        if (transactionResult) {
            await activityMiddleware(req, 0, `Expenditure allocated successfully to ${fullName}(${userid}) for ${description} with amount ${amount}`, 'EXPENDITURE_ALLOCATION');
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Expenditure allocated successfully",
                statuscode: StatusCodes.OK,
                data: null,
                errors: []
            });
        } else {
            await activityMiddleware(req, 0, 'Failed to allocate expenditure', 'EXPENDITURE_ALLOCATION');
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Failed to allocate expenditure",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }
    } catch (error) {
        console.error('Error allocating expenditure:', error);
        await activityMiddleware(req, 0, 'Internal Server Error during expenditure allocation', 'EXPENDITURE_ALLOCATION');
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal Server Error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: []
        });
    }
};

module.exports = allocateExpenditure;
