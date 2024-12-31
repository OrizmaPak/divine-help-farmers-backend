const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { divideAndRoundUp } = require("../../../utils/pageCalculator");

const getLoanAccount = async (req, res) => {
    const user = req.user;  

    try {
        let query = {
            text: `SELECT 
                      la.*, 
                      CONCAT(u1.firstname, ' ', u1.lastname, ' ', COALESCE(u1.othernames, '')) AS useridname,
                      CONCAT(COALESCE(u2.firstname, ''), ' ', COALESCE(u2.lastname, ''), ' ', COALESCE(u2.othernames, '')) AS accountofficername,
                      lp.productname AS loanproductname,
                      row_to_json(lp) AS productdetails,
                      dm.member AS membername,
                      br.branch AS branchname,
                      COALESCE(rp.registrationpoint, 'N/A') AS registrationpointname
                   FROM divine."loanaccounts" la
                   JOIN divine."User" u1 ON la.userid::text = u1.id::text
                   LEFT JOIN divine."User" u2 ON la.accountofficer::text = u2.id::text
                   JOIN divine."loanproduct" lp ON la.loanproduct::text = lp.id::text
                   JOIN divine."DefineMember" dm ON la.member::text = dm.id::text
                   JOIN divine."Branch" br ON la.branch::text = br.id::text
                   LEFT JOIN divine."Registrationpoint" rp ON la.registrationpoint::text = rp.id::text`,
            values: []
        };
        

        // Dynamically build the WHERE clause based on query parameters
        let whereClause = '';
        let valueIndex = 1;
        Object.keys(req.query).forEach((key) => {
            if (key !== 'q') { 
                if (whereClause) {
                    whereClause += ` AND `;
                } else {
                    whereClause += ` WHERE `;
                }
                whereClause += `"${key}" = $${valueIndex}`;
                query.values.push(req.query[key]);
                valueIndex++;
            }
        });

        // Add search query if provided
        if (req.query.q) {
            // Fetch column names from the 'loanaccounts' table
            const { rows: columns } = await pg.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'loanaccounts'
            `);

            const cols = columns.map(row => row.column_name);

            // Generate the dynamic SQL query
            const searchConditions = cols.map(col => `${col}::text ILIKE $${valueIndex}`).join(' OR ');
            if (whereClause) {
                whereClause += ` AND (${searchConditions})`;
            } else {
                whereClause += ` WHERE (${searchConditions})`;
            }
            query.values.push(`%${req.query.q}%`);
            valueIndex++;
        }

        query.text += whereClause;

        // Add pagination
        const searchParams = new URLSearchParams(req.query);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || process.env.DEFAULT_LIMIT, 10);
        const offset = (page - 1) * limit;

        query.text += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
        query.values.push(limit, offset);

        // Debugging: Log the final query and values
        console.log('Executing query:', query.text);
        console.log('With values:', query.values);

        const result = await pg.query(query);
        // console.log('query:', result);
        const loanAccounts = result.rows;

        // Get total count for pagination
        const countQuery = {
            text: `SELECT COUNT(*) FROM divine."loanaccounts" ${whereClause}`,
            values: query.values.slice(0, -2) // Exclude limit and offset
        };
        const { rows: [{ count: total }] } = await pg.query(countQuery);
        const pages = divideAndRoundUp(total, limit);

        await activityMiddleware(req, user.id, 'Loan accounts fetched successfully', 'LOAN_ACCOUNT');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Loan accounts fetched successfully",
            statuscode: StatusCodes.OK,
            data: loanAccounts,
            pagination: {
                total: Number(total),
                pages,
                page,
                limit
            },
            errors: []
        });
    } catch (error) {
        console.error('Unexpected Error:', error);
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching loan accounts', 'LOAN_ACCOUNT');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getLoanAccount };
