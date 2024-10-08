const { StatusCodes } = require("http-status-codes");
const pg = require("../../../db/pg");
const { sendMail } = require("../../../utils/sendEmail");

const manageSubtask = async (req, res) => {
    try {
        const { id, task, title, startdate, enddate, description, createdby, assignedto="", taskstatus } = req.body;

        // Validate required fields
        if (!task || !title || !startdate || !enddate || !taskstatus) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Task, title, start date, end date, and task status are required fields",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Validate start date and end date
        if (new Date(enddate) <= new Date(startdate)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "End date must be greater than start date",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Validate task status
        const validTaskStatuses = ['NOT STARTED', 'WORKING ON IT', 'STUCK', 'PENDING', 'DONE'];
        if (!validTaskStatuses.includes(taskstatus.toUpperCase())) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Task status must be either NOT STARTED, WORKING ON IT, STUCK, PENDING, or DONE",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Check if task exists
        const { rows: [taskExists] } = await pg.query(`SELECT * FROM divine."Task" WHERE id = $1`, [task]);
        if (!taskExists) {
            return res.status(StatusCodes.NOT_FOUND).json({
                status: false,
                message: "Task not found",
                statuscode: StatusCodes.NOT_FOUND,
                data: null,
                errors: []
            });
        }

        // Check if start date and end date are within task's start and end date
        if (new Date(startdate) < new Date(taskExists.startdate) || new Date(enddate) > new Date(taskExists.enddate)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Start date and end date must be within task's start and end date",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Check if assigned to is valid
        const assignedToIds = assignedto ? assignedto.split("||").map(id => id.trim()) : [];
        const { rows: [taskAssignedTo] } = await pg.query(`SELECT assignedto FROM divine."Task" WHERE id = $1`, [task]);
        const taskAssignedToIds = taskAssignedTo.assignedto.split("||");
        if (!assignedToIds.every(id => taskAssignedToIds.includes(id))) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Assigned to is not valid",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }

        // Check if title already exists for the task
        if (!id) {
            const { rows: [subtaskExists] } = await pg.query(`SELECT * FROM divine."Subtask" WHERE task = $1 AND title = $2`, [task, title]);
            if (subtaskExists) {
                return res.status(StatusCodes.CONFLICT).json({
                    status: false,
                    message: "Subtask with the same title already exists for this task",
                    statuscode: StatusCodes.CONFLICT,
                    data: null,
                    errors: []
                });
            }
        }

        // Create or update subtask
        if (id) {
            // Update assignedto field correctly
            const { rows: [updatedSubtask] } = await pg.query(`UPDATE divine."Subtask" SET title = $1, startdate = $2, enddate = $3, description = $4, assignedto = $5, taskstatus = $6 WHERE id = $7 RETURNING *`, [title, startdate, enddate, description, assignedto, taskstatus, id]);
            if (!updatedSubtask) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    status: false,
                    message: "Subtask not found",
                    statuscode: StatusCodes.NOT_FOUND,
                    data: null,
                    errors: []
                });
            }
            // Send mail to assignedto
            if (assignedto) {
                assignedToIds.forEach(async id => {
                    const { rows: [user] } = await pg.query(`SELECT email FROM divine."User" WHERE id = $1`, [id]);
                    if (user) {
                        sendMail(user.email, `Subtask updated: ${title}`, `The subtask ${title} has been updated. New details: Title: ${title}, Start Date: ${startdate}, End Date: ${enddate}, Description: ${description}, Task Status: ${taskstatus}.`);
                    }
                });
            }
            return res.status(StatusCodes.OK).json({
                status: true,
                message: "Subtask updated successfully",
                statuscode: StatusCodes.OK,
                data: updatedSubtask,
                errors: []
            });
        } else {
            const { rows: [newSubtask] } = await pg.query(`INSERT INTO divine."Subtask" (task, title, startdate, enddate, description, createdby, assignedto, taskstatus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [task, title, startdate, enddate, description, req.user.id, assignedto, taskstatus]);
            // Send mail to assignedto
            if (assignedto) {
                assignedToIds.forEach(async id => {
                    const { rows: [user] } = await pg.query(`SELECT email FROM divine."User" WHERE id = $1`, [id]);
                    if (user) {
                        sendMail(user.email, `New subtask: ${title}`, `A new subtask ${title} has been created.`);
                    }
                });
            }
            return res.status(StatusCodes.CREATED).json({
                status: true,
                message: "Subtask created successfully",
                statuscode: StatusCodes.CREATED,
                data: newSubtask,
                errors: []
            });
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
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
    manageSubtask
};
