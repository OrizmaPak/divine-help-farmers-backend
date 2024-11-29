const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const getOnlineUsers = async (req, res) => {
    
    try {
        const { q, userid, branch } = req.query;
        let params = [];
        let queryString = `
            SELECT 
                l.userid,
                l.date,
                CASE 
                    WHEN l.date > NOW() - INTERVAL '30 minutes' THEN 'ONLINE'
                    WHEN l.date > NOW() - INTERVAL '1 hour' THEN 'AWAY'
                    ELSE 'OFFLINE'
                END AS online_status,
                CONCAT(u.firstname, ' ', u.lastname, ' ', u.othernames) AS fullname,
                u.email,
                u.role,
                u.branch,
                b.branch AS branchname,
                u.phone,
                u.address,
                u.createdby,
                CONCAT(u2.firstname, ' ', u2.lastname, ' ', u2.othernames) AS createdby_fullname,
                CASE 
                    WHEN NOW() - l.date <= INTERVAL '1 minute' THEN 'just now'
                    WHEN NOW() - l.date <= INTERVAL '1 hour' THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - l.date)) / 60) || ' minutes ago'
                    WHEN NOW() - l.date <= INTERVAL '24 hours' THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - l.date)) / 3600) || ' hours ago'
                    WHEN NOW() - l.date <= INTERVAL '48 hours' THEN 'yesterday'
                    WHEN NOW() - l.date <= INTERVAL '30 days' THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - l.date)) / 86400) || ' days ago'
                    WHEN NOW() - l.date <= INTERVAL '1 year' THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - l.date)) / 2592000) || ' months ago'
                    ELSE FLOOR(EXTRACT(EPOCH FROM (NOW() - l.date)) / 31536000) || ' years ago'
                END AS time_ago  
            FROM 
                divine."Lastseen" l
            LEFT JOIN 
                divine."User" u ON l.userid = u.id
            LEFT JOIN 
                divine."User" u2 ON u.createdby = u2.id
            LEFT JOIN 
                divine."Branch" b ON u.branch = b.id
            WHERE 
                l.date > NOW() - INTERVAL '1 hour'
        `;

        if (q) {
            // Fetch column names from the 'User' table
            const { rows: columns } = await pg.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Lastseen'`);

            const cols = columns.map(row => row.column_name);

            // Generate the dynamic SQL query
            const searchConditions = cols.map(col => `${col}::text ILIKE $${columns.length + 1}`).join(' OR ');
            queryString += ` AND (${searchConditions})`;
            params = [q];
        }

        if (userid) {
            queryString += ` AND l.userid = $${params.length + 1}`;
            params.push(userid);
        }

        if (branch) {
            queryString += ` AND u.branch = $${params.length + 1}`;
            params.push(branch);
        }

        const { rows: onlineUsers } = await pg.query(queryString, params);

        const onlineCount = onlineUsers.filter(user => user.online_status === 'ONLINE').length;

        await activityMiddleware(req, req.user.id, 'Online users fetched successfully', 'ONLINE_USERS');
        return res.status(StatusCodes.OK).json({
            status: true,
            message: "Online users fetched successfully",
            statuscode: StatusCodes.OK,
            data: {
                onlineUsers,
                onlineCount
            },
            errors: []
        });
    } catch (err) {
        console.error('Unexpected Error:', err);
        await activityMiddleware(req, req.user.id, 'An unexpected error occurred fetching online users', 'ONLINE_USERS');
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
    getOnlineUsers
};

