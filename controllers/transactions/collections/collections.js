const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { performTransactionOneWay } = require("../../../middleware/transactions/performTransaction");

const processCollection = async (req, res) => {
    const { branch, userid, rowsize } = req.body;
    const user = req.user;

    if (!branch || !userid || !rowsize) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Branch, user, and rowsize are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: []
        });
    }

    try {
        // Validate branch
        const { rows: branchData } = await pg.query(`
            SELECT * FROM divine."Branch" WHERE id = $1 AND status = 'ACTIVE'
        `, [branch]);

        if (branchData.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Invalid branch or branch could be inactive",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        // Validate userid
        const { rows: userData } = await pg.query(`
            SELECT * FROM divine."User" WHERE id = $1
        `, [userid]);

        if (userData.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Invalid user ID",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        // Check if the user has a registrationpoint and the role is not 'member'
        const { rows: userCheckData } = await pg.query(`
            SELECT * FROM divine."User" WHERE id = $1
        `, [userid]);

        if (userCheckData.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "User not found",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        if (!userCheckData[0].registrationpoint) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "This user is not a marketer",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        if (userCheckData[0].role == 'MEMBER') {
            return res.status(StatusCodes.FORBIDDEN).json({
                status: false,
                message: "Members cannot process transactions",
                statuscode: StatusCodes.FORBIDDEN,
                data: null,
                errors: []
            });
        }

        console.log('user, ', userCheckData[0])

        const timestamp = new Date().getTime();
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(today.getDate()).padStart(2, '0');
        const dateString = `${year}${month}${day}`;
        const cashref = `CR-${dateString}-${userid}`;

        // Process multiple transactions
        let failedTransactions = [];


        for (let i = 1; i <= rowsize; i++) {
            const accountnumber = req.body[`accountnumber${i}`];
            const credit = req.body[`credit${i}`];

            if (!accountnumber || !credit) {
                return res.status(StatusCodes.BAD_REQUEST).json({ 
                    status: false,
                    message: `Account number and credit are required for row ${i}`,
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: []
                });
            }

            const transaction = {
                accountnumber,
                credit: Number(credit),
                debit: 0,
                reference: "",
                transactiondate: new Date(),
                transactiondesc: 'Credit Cash transaction collected by '+userCheckData[0].firstname+' '+userCheckData[0].lastname+' '+userCheckData[0].othernames,
                cashref: cashref,
                currency: 'NGN',
                description: `Credit of ${credit} to account ${accountnumber}`,
                branch,
                registrationpoint: userCheckData[0].registrationpoint,
                ttype: 'CREDIT', 
                tfrom: 'CASH',
                tax: false,
            };
            
            const creditTransaction = await performTransactionOneWay(transaction, userCheckData[0].id);

            if (!creditTransaction) {
                failedTransactions.push(i);
            }
        }

        if (failedTransactions.length > 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: `Failed to credit accounts for rows: ${failedTransactions.join(', ')}.`,
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        await activityMiddleware(req, user.id, 'Transactions processed successfully', 'TRANSACTION');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Transactions processed successfully",
            statuscode: StatusCodes.OK,
            data: null,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred processing transactions', 'TRANSACTION');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { processCollection };