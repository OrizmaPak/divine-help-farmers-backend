const { StatusCodes } = require("http-status-codes");
const { activityMiddleware } = require("../../../middleware/activity");
const pg = require("../../../db/pg");

const changeBranch = async (req, res) => {
    const { userid, branch } = req.body;
    const user = req.user;

    if (!userid || !branch) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "User ID and branch are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    // Check if userid is valid and if the user is already in the specified branch
    const { rows: userRows } = await pg.query(`
        SELECT id, branch FROM divine."User" WHERE id = $1
    `, [userid]);

    if (userRows.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid user ID",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    if (userRows[0].branch == branch) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "User is already in the specified branch",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    // Check if branch is valid
    const { rows: branchRows } = await pg.query(`
        SELECT id FROM divine."Branch" WHERE id = $1
    `, [branch]);

    if (branchRows.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Invalid branch",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    try {
        // Update branch in User table
        await pg.query(`
            UPDATE divine."User"
            SET branch = $1
            WHERE id = $2
        `, [branch, userid]);

        // Update branch in Savings table
        await pg.query(`
            UPDATE divine."savings"
            SET branch = $1
            WHERE userid = $2
        `, [branch, userid]);

        // Update branch in LoanAccounts table
        await pg.query(`
            UPDATE divine."loanaccounts"
            SET branch = $1
            WHERE userid = $2
        `, [branch, userid]);

        // Update branch in RotaryAccount table
        await pg.query(`
            UPDATE divine."rotaryaccount"
            SET branch = $1
            WHERE userid = $2
        `, [branch, userid]);

        // Save the branch change to the branchchanged table
         await pg.query(`
            INSERT INTO divine."branchchanged" (userid, branch, previousbranch, dateadded, status)
            VALUES ($1, $2, $3, NOW(), 'ACTIVE')
        `, [userid, branch, userRows[0].branch]);
        await activityMiddleware(req, user.id, 'Branch updated successfully', 'BRANCH_UPDATE');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Branch updated successfully",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred updating branch', 'BRANCH_UPDATE');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { changeBranch };