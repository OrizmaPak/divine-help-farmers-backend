const { StatusCodes } = require("http-status-codes");
const pg = require("../../../../db/pg");
const { activityMiddleware } = require("../../../../middleware/activity");

const getWithdrawalRequests = async (req, res) => {
    const user = req.user;

    try {
        let query = {
            text: `SELECT wr.*, 
                          CONCAT(u.firstname, ' ', u.lastname, ' ', COALESCE(u.othernames, '')) AS useridname,
                          CONCAT(c.firstname, ' ', c.lastname, ' ', COALESCE(c.othernames, '')) AS createdbyname
                   FROM divine."withdrawalrequest" wr
                   JOIN divine."User" u ON wr.userid = u.id
                   JOIN divine."User" c ON wr.createdby = c.id`,
            values: []
        };

        // Dynamically build the WHERE clause based on query parameters
        let whereClause = '';   
        let valueIndex = 1;
        Object.keys(req.query).forEach((key) => {
            if (key !== 'q' && key !== 'startdate' && key !== 'enddate' && !(key === 'requeststatus' && req.query[key] === 'ALL')) {
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

        // Add date range filter if provided
        if (req.query.startdate) {
            if (whereClause) {
                whereClause += ` AND `;
            } else {
                whereClause += ` WHERE `;
            }
            whereClause += `wr."dateadded" >= $${valueIndex}`;
            query.values.push(req.query.startdate);
            valueIndex++;
        }

        if (req.query.enddate) {
            if (whereClause) {
                whereClause += ` AND `;
            } else {
                whereClause += ` WHERE `;
            }
            whereClause += `wr."dateadded" <= $${valueIndex}`;
            query.values.push(req.query.enddate);
            valueIndex++;
        }

        // Add search query if provided
        if (req.query.q) {
            // Fetch column names from the 'withdrawalrequest' table
            const { rows: columns } = await pg.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'withdrawalrequest'
            `);

            const cols = columns.map(row => row.column_name);

            // Generate the dynamic SQL query
            const searchConditions = cols.map(col => `wr.${col}::text ILIKE $${valueIndex}`).join(' OR ');
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

        const result = await pg.query(query);
        const withdrawalRequests = result.rows;

        // Get total count for pagination
        const countQuery = {
            text: `SELECT COUNT(*) FROM divine."withdrawalrequest" wr ${whereClause}`,
            values: query.values.slice(0, -2) // Exclude limit and offset
        };
        const { rows: [{ count: total }] } = await pg.query(countQuery);
        const pages = Math.ceil(total / limit);

        await activityMiddleware(req, user.id, 'Withdrawal requests fetched successfully', 'WITHDRAWAL');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Withdrawal requests fetched successfully",
            statuscode: StatusCodes.OK,
            data: withdrawalRequests,
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
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching withdrawal requests', 'WITHDRAWAL');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getWithdrawalRequests };
