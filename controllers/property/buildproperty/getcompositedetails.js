const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");
const { divideAndRoundUp } = require("../../../utils/pageCalculator");

const getCompositeDetails = async (req, res) => {
    const user = req.user;
    const { itemname } = req.body.query;

    try {
        let query = {
            text: `SELECT cd.compositeid, 
                          i.compositename, 
                          cd.itemid, 
                          inv.itemidname,  
                          cd.qty, 
                          cd.createdby, 
                          cd.dateadded, 
                          cd.status 
                   FROM divine."compositedetails" cd
                   JOIN inventory i ON cd.compositeid = i.compositeid
                   JOIN inventory inv ON cd.itemid = inv.itemid`,
            values: []
        };

        // Dynamically build the WHERE clause based on query parameters
        let whereClause = '';
        let valueIndex = 1;
        Object.keys(req.query).forEach((key) => {
            if (key !== 'q' && key !== 'sort') {
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
            // Fetch column names from the 'compositedetails' table
            const { rows: columns } = await pg.query(`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'compositedetails'
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

        // Add sorting if provided
        if (req.query.sort) {
            const sortParams = req.query.sort.split(',');
            const sortConditions = sortParams.map(param => {
                const [field, order] = param.split(':');
                return `"${field}" ${order.toUpperCase()}`;
            }).join(', ');
            query.text += ` ORDER BY ${sortConditions}`;
        }

        // Add pagination
        const searchParams = new URLSearchParams(req.query);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || process.env.DEFAULT_LIMIT, 10);
        const offset = (page - 1) * limit;

        query.text += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
        query.values.push(limit, offset);

        const result = await pg.query(query);
        const compositeDetails = result.rows;

        // Group the items by compositeid
        const groupedCompositeDetails = compositeDetails.reduce((acc, curr) => {
            let composite = acc.find(item => item.compositeid === curr.compositeid);
            if (!composite) {
                composite = {
                    compositeid: curr.compositeid,
                    compositename: curr.compositename,
                    items: []
                };
                acc.push(composite);
            }
            composite.items.push({
                itemid: curr.itemid,
                itemidname: curr.itemidname,
                qty: curr.qty,
                createdby: curr.createdby,
                dateadded: curr.dateadded,
                status: curr.status
            });
            return acc;
        }, []);

        // Get total count for pagination
        const countQuery = {
            text: `SELECT COUNT(*) FROM divine."compositedetails" cd
                   JOIN inventory i ON cd.compositeid = i.compositeid
                   JOIN inventory inv ON cd.itemid = inv.itemid ${whereClause}`,
            values: query.values.slice(0, -2) // Exclude limit and offset
        };
        const { rows: [{ count: total }] } = await pg.query(countQuery);
        const pages = divideAndRoundUp(total, limit);

        await activityMiddleware(req, user.id, 'Composite details fetched successfully', 'COMPOSITE');

        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Composite details fetched successfully",
            statuscode: StatusCodes.OK,
            data: groupedCompositeDetails,
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
        await activityMiddleware(req, user.id, 'An unexpected error occurred fetching composite details', 'COMPOSITE');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { getCompositeDetails };