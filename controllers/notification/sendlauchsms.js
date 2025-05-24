const { StatusCodes } = require("http-status-codes");
const { sendSms } = require("../../utils/sendSms");
const { activityMiddleware } = require("../../middleware/activity");
const pg = require("../../db/pg");

const sendLaunchSms = async (req, res) => {
    const user = req.user;

    console.log('message router entered');

    try {
        // Fetch all rows from the tempsms table
        const { rows: tempSmsRows } = await pg.query({
            text: `SELECT id, phone, message, sendstatus FROM divine."tempsms" WHERE sendstatus IS NULL`
        });

        console.log(`Total SMS to process: ${tempSmsRows.length}`);

        let success = true;
        let sentCount = 0;
        const failedIds = [];

        // Send SMS for each row using sendSms function
        for (const row of tempSmsRows) {
            const { id, phone: phoneNumber, message } = row;

            if (phoneNumber) {
                const response = await sendSms(phoneNumber, message);
                if (!response) {
                    success = false;
                    failedIds.push(id);
                    await activityMiddleware(req, user.id, `Failed to send SMS to ${phoneNumber}`, 'SMS_SEND_ERROR');
                } else {
                    sentCount++;
                    console.log(`SMS sent successfully to ${phoneNumber}. Total sent: ${sentCount}`);
                    await activityMiddleware(req, user.id, `SMS sent successfully to ${phoneNumber}`, 'SMS_SEND');
                }
            }
        }

        // Update sendstatus in the database
        if (failedIds.length > 0) {
            await pg.query({
                text: `UPDATE tempsms SET sendstatus = 'FAILED' WHERE id = ANY($1::int[])`,
                values: [failedIds]
            });
            console.log(`Failed to send SMS to ${failedIds.length} numbers`);
        }
        const successfulIds = tempSmsRows.filter(row => !failedIds.includes(row.id)).map(row => row.id);
        if (successfulIds.length > 0) {
            await pg.query({
                text: `UPDATE tempsms SET sendstatus = 'SENT' WHERE id = ANY($1::int[])`,
                values: [successfulIds]
            });
            console.log(`Successfully sent SMS to ${successfulIds.length} numbers`);
        }

        const summaryMessage = `SMS sent to ${sentCount} numbers`;

        if (success) {
            return res.status(StatusCodes.OK).json({
                status: true,
                message: `SMS sent successfully. ${summaryMessage}`,
                statuscode: StatusCodes.OK,
                data: null,
                errors: []
            });
        } else {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: `Failed to send some SMS. ${summaryMessage}`,
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: [`Failed to send some SMS`]
            });
        }
    } catch (error) {
        console.error(`Error sending SMS:`, error);
        await activityMiddleware(req, user.id, `Error sending SMS`, `SMS_SEND_ERROR`);

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal server error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { sendLaunchSms };
