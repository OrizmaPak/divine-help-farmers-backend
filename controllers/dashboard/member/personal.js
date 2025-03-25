const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const getPersonalAccountDetails = async (req, res) => {
    
    if (req.query.userid) {
        const userQuery = {
            text: `SELECT * FROM divine."User" WHERE id = $1`,
            values: [req.query.userid]
        };
        const { rows: [userData] } = await pg.query(userQuery);

        if (!userData) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "User not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: ["User with the provided ID does not exist"]
            });
        }

        req.user = userData;
    }

    const user = req.user;

    try {
        // 1) Fetch the personal account prefix from the OrganisationSettings table
        const settingsQuery = {
            text: `SELECT personal_account_prefix FROM divine."Organisationsettings" LIMIT 1`
        };
        const { rows: settingsRows } = await pg.query(settingsQuery);

        if (settingsRows.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Organisation settings not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        const personalAccountPrefix = settingsRows[0].personal_account_prefix;

        // 2) Generate the personal account number using the user's phone number
        const personalAccountNumber = `${personalAccountPrefix}${user.phone}`;

        // 3) Calculate the balance from the transaction table
        const balanceQuery = {
            text: `SELECT SUM(credit) - SUM(debit) AS balance FROM divine."transaction" WHERE accountnumber = $1`,
            values: [personalAccountNumber]
        };
        const { rows: balanceRows } = await pg.query(balanceQuery);
        const balance = balanceRows[0].balance || 0;

        // 4) Fetch the last 10 transactions for the personal account
        const transactionsQuery = {
            text: `SELECT * FROM divine."transaction" WHERE accountnumber = $1 ORDER BY dateadded DESC LIMIT 10`,
            values: [personalAccountNumber]
        };
        const { rows: lastTransactions } = await pg.query(transactionsQuery);

        // 5) Log activity
        await activityMiddleware(req, user.id, 'Fetched personal account details successfully', 'PERSONAL_ACCOUNT');

        // 6) Return the account details
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Personal account details fetched successfully",
            statuscode: StatusCodes.OK,
            data: {
                personalAccountNumber,
                balance,
                lasttentransactions:lastTransactions
            },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching personal account details', 'PERSONAL_ACCOUNT');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getPersonalAccountDetails };
