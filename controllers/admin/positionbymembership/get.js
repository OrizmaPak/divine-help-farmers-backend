const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { addOneDay } = require("../../../utils/expiredate");
const { divideAndRoundUp } = require("../../../utils/pageCalculator");

const getdefinedmembershipposition = async (req, res) => {
    const user = req.user;

    try {
        let query = {
            text: `SELECT p.*, b.branch AS branchname, m.member AS membername, 
                   CONCAT(u.firstname, ' ', u.lastname, ' ', COALESCE(u.othernames, '')) AS useridname 
                   FROM divine."Position" p 
                   LEFT JOIN divine."Branch" b ON p.branch = b.id 
                   LEFT JOIN divine."DefineMember" m ON p.member = m.id 
                   LEFT JOIN divine."User" u ON p.userid = u.id
                   WHERE 1=1`,
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
            // Fetch column names from the 'Branch' table
            const { rows: columns } = await pg.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'Branch'
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

        // Add startdate and enddate
        const startdate = req.query.startdate || '';
        const enddate = req.query.enddate || '';
        if (startdate && enddate) {
            const adjustedStartdate = addOneDay(startdate);
            const adjustedEnddate = addOneDay(enddate);
            if (whereClause) {
                whereClause += ` AND date BETWEEN $${valueIndex} AND $${valueIndex + 1}`;
            } else {
                whereClause += ` WHERE date BETWEEN $${valueIndex} AND $${valueIndex + 1}`;
            }
            query.values.push(adjustedStartdate, adjustedEnddate);
            valueIndex += 2;
        } else if (startdate) {
            const adjustedStartdate = addOneDay(startdate);
            if (whereClause) {
                whereClause += ` AND date >= $${valueIndex}`;
            } else {
                whereClause += ` WHERE date >= $${valueIndex}`;
            }
            query.values.push(adjustedStartdate);
            valueIndex++;
        } else if (enddate) {
            const adjustedEnddate = addOneDay(enddate);
            if (whereClause) {
                whereClause += ` AND date <= $${valueIndex}`;
            } else {
                whereClause += ` WHERE date <= $${valueIndex}`;
            }
            query.values.push(adjustedEnddate);
            valueIndex++;
        }

        query.text += whereClause;

        // Add pagination
        const searchParams = new URLSearchParams(req.query);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || process.env.DEFAULT_LIMIT, 10);
        const offset = (page - 1) * limit;

        query.text += ` ORDER BY ${req.query.sort || 'id'} ${req.query.order || 'DESC'} LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
        query.values.push(limit, offset);

        const result = await pg.query(query);
        const positions = result.rows;

        // Get total count for pagination
        const countQuery = {
            text: `SELECT COUNT(*) FROM divine."Position" ${whereClause}`,
            values: query.values.slice(0, -2) // Exclude limit and offset
        };
        const { rows: [{ count: total }] } = await pg.query(countQuery);
        const pages = divideAndRoundUp(total, limit);

        return res.status(StatusCodes.OK).json({
            status: true,
            message: positions.length > 0 ? "Organization Membership fetched successfully" : "No Member found",
            statuscode: StatusCodes.OK,
            data: positions,
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
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = {
    getdefinedmembershipposition
};