const { StatusCodes } = require("http-status-codes"); // Import StatusCodes for HTTP status codes
const { activityMiddleware } = require("../../../middleware/activity"); // Added tracker middleware for activity tracking
const pg = require("../../../db/pg"); // Import PostgreSQL database connection

// Function to handle GET savings products request including deductions and interest
const getSavingsProducts = async (req, res) => {

    let userid;

    // Extract user from request
    const user = req.user

    try {
        const { rows: savingsproducts } = await pg.query(`SELECT * FROM divine."savingsproduct" WHERE "status" = 'ACTIVE'`); // Fetch all savings products
        if(savingsproducts.length > 0) {
            // Fetch deductions for each savings product
            const deductionsPromises = savingsproducts.map(async (product) => {
                const { rows: deductions } = await pg.query(`SELECT * FROM divine."Deduction" WHERE "savingsproductid" = $1 AND "status" = 'ACTIVE'`, [product.id]);
                return { ...product, deductions };
            });
            const deductionsResults = await Promise.all(deductionsPromises);

            // Fetch interest for each savings product
            const interestPromises = savingsproducts.map(async (product) => {
                const { rows: interests } = await pg.query(`SELECT * FROM divine."Interest" WHERE "savingsproductid" = $1 AND "status" = 'ACTIVE'`, [product.id]);
                return { ...product, interests };
            });
            const interestResults = await Promise.all(interestPromises);

            // Combine results with deductions and interest
            const combinedResults = interestResults.map((interestResult, index) => ({
                ...interestResult,
                ...deductionsResults[index]
            }));

            await activityMiddleware(req, user.id, 'Savings products, deductions, and interest fetched successfully', 'SAVINGSPRODUCT'); // Tracker middleware
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Savings products, deductions, and interest fetched successfully",
                statuscode: StatusCodes.OK,
                data: combinedResults,
                errors: []
            });
        }
        if(savingsproducts.length == 0) {
            await activityMiddleware(req, user.id, 'No savings products found', 'SAVINGSPRODUCT'); // Tracker middleware
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No savings products found",
                statuscode: StatusCodes.OK,
                data: '',
                errors: []  
            });
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching savings products, deductions, and interest', 'SAVINGSPRODUCT'); // Tracker middleware
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: []
        });
    }
}

module.exports = {
    getSavingsProducts
};



