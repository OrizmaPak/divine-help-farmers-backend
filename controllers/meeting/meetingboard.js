const { StatusCodes } = require("http-status-codes");
const pg = require("../../db/pg");
const { activityMiddleware } = require("../../middleware/activity");
const { getTransactionPeriod } = require("../../utils/datecode");

const meetingboardreport = async (req, res) => {
    const { branch, member } = req.query;

    if (!branch || !member) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Branch and member must be provided",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Branch and member are required fields"]
        });
    }

    try {
        // Check if branch exists
        const { rowCount: branchCount, rows: branchRows } = await pg.query(`
            SELECT branch FROM divine."Branch" WHERE id = $1
        `, [branch]);

        if (branchCount === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Branch not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: ["Branch does not exist"]
            });
        }

        const branchName = branchRows[0].branch;

        // Check if member exists
        const { rowCount: memberCount } = await pg.query(`
            SELECT 1 FROM divine."User" WHERE id = $1
        `, [member]);

        if (memberCount === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Member not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: ["Member does not exist"]
            });
        }

        // Fetch all products with meetingviewable set to 'YES'
        const { rows: products } = await pg.query(`
            SELECT id, productname, compulsorydepositfrequency, compulsorydepositfrequencyamount 
            FROM divine."savingsproduct" 
            WHERE meetingviewable = 'YES'
        `);

        // Fetch all users of the branch and filter by member
        let { rows: users } = await pg.query(`
            SELECT u.id, u.firstname, u.lastname, u.othernames, u.phone, u.email 
            FROM divine."User" u
            WHERE u.branch = $1
        `, [branch]);

        users = await Promise.all(users.map(async user => {
            const { rowCount } = await pg.query(`
                SELECT 1 
                FROM divine."Membership" 
                WHERE userid = $1 AND member = $2
            `, [user.id, member]);
            return rowCount > 0 ? user : null;
        }));

        users = users.filter(user => user !== null);

        const today = new Date();
        const results = [];

        for (const user of users) {
            const userProducts = [];
            let totalOwed = 0;
            let allPaid = true;
            let dateRange;

            for (const product of products) {
                // Determine the compulsory deposit frequency
                const { rows: frequencyOverride } = await pg.query(`
                    SELECT compulsorydepositfrequency 
                    FROM divine."frequencyoverride" 
                    WHERE branch = $1 AND savingsproductid = $2
                `, [branch, product.id]);

                let frequency = frequencyOverride.length > 0 ? frequencyOverride[0].compulsorydepositfrequency : product.compulsorydepositfrequency || 'D31T';
                let frequencyAmount = product.compulsorydepositfrequencyamount || 5000;

                // Get the transaction period
                 dateRange = getTransactionPeriod(frequency, today);

                // Get account numbers for the user and product, filter by member
                const { rows: accounts } = await pg.query(`
                    SELECT accountnumber 
                    FROM divine."savings" 
                    WHERE userid = $1 AND savingsproductid = $2 AND member = $3
                `, [user.id, product.id, member]);

                for (const account of accounts) {
                    // Fetch transactions within the date range
                    const { rows: transactions } = await pg.query(`
                        SELECT SUM(credit) as totalCredit 
                        FROM divine."transaction" 
                        WHERE accountnumber = $1 AND status = 'ACTIVE' 
                        AND transactiondate BETWEEN $2 AND $3
                    `, [account.accountnumber, dateRange.startDate, dateRange.endDate]);

                    const totalCredit = transactions[0].totalcredit || 0;
                    let paymentStatus = `NOT PAID (${account.accountnumber})`;

                    if (totalCredit > 0) {
                        if (totalCredit < frequencyAmount) {
                            paymentStatus = `PARTIALLY PAID (${account.accountnumber})`;
                            totalOwed += (frequencyAmount - totalCredit);
                            allPaid = false;
                        } else {
                            paymentStatus = 'PAID';
                        }
                    } else {
                        totalOwed += frequencyAmount;
                        allPaid = false;
                    }

                    userProducts.push({
                        productname: product.productname,
                        payment: paymentStatus
                    });
                }
            } 

            if (!allPaid) {
                // Fetch personal account prefix
                const { rows: orgSettings } = await pg.query(`
                    SELECT personal_account_prefix 
                    FROM divine."Organisationsettings"
                `);
                const personalAccountPrefix = orgSettings[0].personal_account_prefix || '';

                // Construct personal account number
                const personalAccountNumber = `${personalAccountPrefix}${user.phone}`;

                // Check balance of personal account
                const { rows: personalAccountBalance } = await pg.query(`
                    SELECT SUM(credit) - SUM(debit) as balance 
                    FROM divine."transaction" 
                    WHERE accountnumber = $1 AND status = 'ACTIVE'
                    AND transactiondate <= $2
                `, [personalAccountNumber, dateRange.endDate]);

                const personalBalance = personalAccountBalance[0].balance || 0;

                console.log('personalBalance:', personalBalance, personalAccountNumber);

                if (personalBalance >= totalOwed) {
                    userProducts.push({
                        productname: 'Personal Account',
                        payment: `SUFFICIENT FUNDS TO COVER ALL DUES (${personalAccountNumber})`
                    });
                } else if (personalBalance > 0) {
                    const payableProducts = userProducts.filter(p => p.payment !== 'PAID' && !p.payment.includes('SUFFICIENT FUNDS TO COVER'));
                    let remainingBalance = personalBalance;
                    const payableProductNames = [];

                    for (const product of payableProducts) {
                        const productInfo = products.find(p => p.productname === product.productname);
                        if (remainingBalance >= productInfo.compulsorydepositfrequencyamount) {
                            payableProductNames.push(product.productname);
                            remainingBalance -= productInfo.compulsorydepositfrequencyamount;
                        }
                    }

                    if (payableProductNames.length > 0) {
                        userProducts.push({
                            productname: 'Personal Account',
                            payment: `SUFFICIENT TO COVER: ${payableProductNames.join(', ')} (${personalAccountNumber})`
                        });
                    } else {
                        userProducts.push({
                            productname: 'Personal Account',
                            payment: `INSUFFICIENT FUNDS (${personalAccountNumber})`
                        });
                    }
                } else {
                    userProducts.push({
                        productname: 'Personal Account',
                        payment: `NO FUNDS (${personalAccountNumber})`
                    });
                }
            }

            results.push({
                fullname: `${user.lastname} ${user.firstname} ${user.othername || ''}`.trim(),
                phone: user.phone,
                email: user.email,
                branch: branchName,
                product: userProducts
            });
        }

        await activityMiddleware(req, member, 'Savings status fetched successfully', 'SAVINGS_STATUS');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Savings status fetched successfully",
            statuscode: StatusCodes.OK,
            data: results,
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, member, 'An unexpected error occurred fetching savings status', 'SAVINGS_STATUS');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { meetingboardreport };
