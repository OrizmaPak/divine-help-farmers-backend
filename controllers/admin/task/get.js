const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { activityMiddleware } = require("../../../middleware/activity");

const getTask = async (req, res) => {
    let { startdate, enddate, branch, priority, taskstatus } = req.query;

    try {
        let queryString = `
            SELECT t.*,
            (
                SELECT json_agg(s)
                FROM divine."Subtask" s
                WHERE s.task = t.id
            ) as subtasks
            FROM divine."Task" t
            WHERE 1=1
        `;
        let params = [];

        if (startdate) {
            queryString += ` AND t.startdate >= $${params.length + 1}`;
            params.push(startdate);
        }
        if (enddate) {
            queryString += ` AND t.enddate <= $${params.length + 1}`;
            params.push(enddate);
        }
        if (branch) {
            queryString += ` AND t.branch = $${params.length + 1}`;
            params.push(branch);
        }
        if (priority) {
            queryString += ` AND t.priority = $${params.length + 1}`;
            params.push(priority);
        }
        if (taskstatus) {
            queryString += ` AND t.taskstatus = $${params.length + 1}`;
            params.push(taskstatus);
        }

        const { rows: tasks } = await pg.query(queryString, params);

        if (tasks.length > 0) {
            await activityMiddleware(req, req.user.id, 'Tasks fetched successfully', 'TASK');
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Tasks fetched successfully",
                statuscode: StatusCodes.OK,
                data: tasks,
                errors: []
            });
        } else {
            await activityMiddleware(req, req.user.id, 'No tasks found', 'TASK');
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "No tasks found",
                statuscode: StatusCodes.OK,
                data: [],
                errors: []
            });
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
        await activityMiddleware(req, req.user.id, 'An unexpected error occurred fetching tasks', 'TASK');
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
    getTask
};

