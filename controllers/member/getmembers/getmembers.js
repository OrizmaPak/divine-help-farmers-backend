    const { StatusCodes } = require("http-status-codes");
    const { activityMiddleware } = require("../../../middleware/activity");
    const pg = require("../../../db/pg");
    const { addOneDay } = require("../../../utils/expiredate");
    const { divideAndRoundUp } = require("../../../utils/pageCalculator");
    
    const getUsers = async (req, res) => {
        const user = req.user;
        console.log('we entered the user registration get')
        try {
            let query = {
                text: `SELECT u.*, b.branch AS branchname, rp.registrationpoint AS registrationpointname
                       FROM divine."User" u
                       LEFT JOIN divine."Branch" b ON u.branch = b.id
                       LEFT JOIN divine."Registrationpoint" rp ON u.registrationpoint = rp.id`,
                values: []
            }; 
    
            // Determine access level based on user role and permissions
            let whereClause = '';
            if (user.role !== 'SUPERADMIN' && (!user.permissions || !user.permissions.includes('FILTER ALL USERS'))) {
                // Restrict to users from the same branch
                whereClause += whereClause ? ` AND u."branch" = $${query.values.length + 1}` : ` WHERE u."branch" = $${query.values.length + 1}`;
                query.values.push(user.branch);
            }

            console.log(user.branch)
    
            // Dynamically build the WHERE clause based on query parameters
            let valueIndex = query.values.length + 1;
            Object.keys(req.query).forEach((key) => {
                if (key !== 'q') {
                    whereClause += whereClause ? ` AND ` : ` WHERE `;
                    whereClause += `u."${key}" = $${valueIndex}`;
                    query.values.push(req.query[key]);
                    valueIndex++;
                }
            });
    
            // Add search query if provided
            if (req.query.q) {
                // Fetch column names from the 'User' table
                const { rows: columns } = await pg.query(`
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'User'
                `);
    
                const cols = columns.map(row => row.column_name);
    
                // Split the search query into individual terms
                const searchTerms = req.query.q.split(' ');

                // Generate the dynamic SQL query for each search term
                searchTerms.forEach(term => {
                    const searchConditions = cols.map(col => `u.${col}::text ILIKE $${valueIndex}`).join(' OR ');
                    whereClause += whereClause ? ` AND (${searchConditions})` : ` WHERE (${searchConditions})`;
                    query.values.push(`%${term}%`);
                    valueIndex++;
                });
            }
    
            query.text += whereClause;
    
            // Add pagination
            const searchParams = new URLSearchParams(req.query);
            const page = parseInt(searchParams.get('page') || '1', 10);
            let limit = parseInt(searchParams.get('limit') || process.env.DEFAULT_LIMIT, 10);

            // If in development environment, set maximum limit to 100
            if (process.env.NODE_ENV === 'development' && limit > 100) {
                limit = 50;
            }else{
                limit = 200;
            }
 
            const offset = (page - 1) * limit;
    
            query.text += ` LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
            query.values.push(limit, offset);
    
            const result = await pg.query(query);
            const users = result.rows.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });

            // Fetch membership details for each user
            for (let user of users) {
                try {
                    const membershipQuery = `
                        SELECT m.*, dm.member AS membername
                        FROM divine."Membership" m
                        LEFT JOIN divine."DefineMember" dm ON m.member = dm.id
                        WHERE m.userid = $1
                    `;
                    const { rows: membershipRows } = await pg.query(membershipQuery, [user.id]);
                    user.membership = membershipRows.length > 0 ? membershipRows : null;
                } catch (error) {
                    console.error('Error fetching membership details:', error);
                    user.membership = null;
                }
            }
    
            // Get total count for pagination
            const countQuery = {
                text: `SELECT COUNT(*) FROM divine."User" u ${whereClause}`,
                values: whereClause ? query.values.slice(0, -2) : []
            };
            const { rows: [{ count: total }] } = await pg.query(countQuery);
            const pages = divideAndRoundUp(total, limit);
    
            await activityMiddleware(req, user.id, 'Users fetched successfully', 'USER');
    
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Users fetched successfully",
                statuscode: StatusCodes.OK,
                data: users,
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
            await activityMiddleware(req, user.id, 'An unexpected error occurred fetching users', 'USER');
    
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: "An unexpected error occurred",
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: [error.message]
            });
        }
    };
    
    module.exports = { getUsers }; 
