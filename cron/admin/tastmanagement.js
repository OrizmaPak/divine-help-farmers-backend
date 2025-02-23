const pg = require("../../db/pg");
const schedule = require("node-schedule");

schedule.scheduleJob("0 0 * * *", async () => {
    try {
        // Fetch tasks and subtasks with startdate or enddate as today or overdue
        const { rows: tasks } = await pg.query(`
            SELECT id, title, startdate, enddate, assignedto, 'task' AS type
            FROM divine."Task"
            WHERE (startdate = CURRENT_DATE OR enddate = CURRENT_DATE OR enddate < CURRENT_DATE)
            AND taskstatus != 'COMPLETED' AND status = 'ACTIVE'
        `);

        const { rows: subtasks } = await pg.query(`
            SELECT id, title, startdate, enddate, assignedto, 'subtask' AS type
            FROM divine."Subtask"
            WHERE (startdate = CURRENT_DATE OR enddate = CURRENT_DATE OR enddate < CURRENT_DATE)
            AND taskstatus != 'COMPLETED' AND status = 'ACTIVE'
        `);

        const allTasks = [...tasks, ...subtasks];

        for (const task of allTasks) {
            const { id, title, startdate, enddate, assignedto, type } = task;
            const assignedUsers = assignedto.split("||");
            let description = '';

            if (startdate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]) {
                description = `Your ${type} "${title}" starts today.`;
            } else if (enddate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]) {
                description = `Your ${type} "${title}" ends today. Please try to complete it.`;
            } else if (enddate < new Date()) {
                const overdueDays = Math.floor((new Date() - enddate) / (1000 * 60 * 60 * 24));
                description = `Your ${type} "${title}" is overdue by ${overdueDays} days. Please try to deliver on the task.`;
            }

            for (const user of assignedUsers) {
                await pg.query(`
                    INSERT INTO divine."notification" (userid, title, description, dateadded, createdby, status, location)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [user, `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`, description, new Date(), 0, 'ACTIVE', 'taskmanagement']);
            }
        }
    } catch (error) {
        console.error('Error in task management cron job:', error);
    }
});
 