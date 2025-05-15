const { StatusCodes } = require("http-status-codes");
const { sendSmsBulk } = require("../../utils/sendSms");
const { sendBulkEmails } = require("../../utils/sendEmail");
const { activityMiddleware } = require("../../middleware/activity");
const { internationalizePhoneNumber } = require("../../utils/sanitizer");
const pg = require("../../db/pg");

const sendMessage = async (req, res) => {
    const user = req.user;
    const { ids, message, channel, subject } = req.body;

    console.log('message router entered');

    try {
        if (!ids || !message || !channel) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "User IDs, message, and channel are required",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: ["User IDs, message, and channel are required"]
            });
        }

        const userIds = ids.includes('||') ? ids.split('||') : [ids];

        // Fetch all users at once
        const { rows: recipients } = await pg.query({
            text: `SELECT id, phone, email, country FROM divine."User" WHERE id = ANY($1::int[])`,
            values: [userIds.map(id => parseInt(id, 10))]
        });

        let success = true;
        let sentCount = 0;

        if (channel === 'SMS') {
            const phoneNumbers = [];
            for (const recipient of recipients) {
                let phoneNumber = recipient.phone;
                if (phoneNumber && phoneNumber.startsWith('0')) {
                    try {
                        phoneNumber = internationalizePhoneNumber(phoneNumber, recipient.country || 'nigeria');
                    } catch (error) {
                        console.error(`Error internationalizing phone number for user ${recipient.id}:`, error);
                        continue;
                    }
                }
                if (phoneNumber) {
                    phoneNumbers.push(phoneNumber);
                }
            }
            if (phoneNumbers.length > 0) {
                const response = await sendSmsBulk(phoneNumbers, message);
                if (!response) {
                    success = false;
                    await activityMiddleware(req, user.id, `Failed to send SMS to some users`, 'SMS_SEND_ERROR');
                } else {
                    sentCount = phoneNumbers.length;
                    await activityMiddleware(req, user.id, `SMS sent successfully to users`, 'SMS_SEND');
                }
            }
        } else if (channel === 'EMAIL') {
            if (!subject) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: false,
                    message: "Subject is required for email",
                    statuscode: StatusCodes.BAD_REQUEST,
                    data: null,
                    errors: ["Subject is required for email"]
                });
            }

            const emailDetailsArray = recipients.map(recipient => ({
                to: recipient.email,
                subject: subject,
                text: message,
                html: `<p>${message}</p>`
            }));

            const response = await sendBulkEmails(emailDetailsArray);
            if (!response) {
                success = false;
                await activityMiddleware(req, user.id, `Failed to send EMAIL to some users`, 'EMAIL_SEND_ERROR');
            } else {
                sentCount = recipients.length;
                await activityMiddleware(req, user.id, `EMAIL sent successfully to users`, 'EMAIL_SEND');
            }
        }

        const summaryMessage = `${channel} sent to ${sentCount} ${channel === 'SMS' ? 'numbers' : 'emails'}`;

        // Save the message batch to the database
        await pg.query({
            text: `INSERT INTO divine."messagehistory" (message, channel, ids, createdby) VALUES ($1, $2, $3, $4)`,
            values: [message, channel, ids, user.id]
        });

        if (success) {
            return res.status(StatusCodes.OK).json({
                status: true,
                message: `${channel} sent successfully. ${summaryMessage}`,
                statuscode: StatusCodes.OK,
                data: null,
                errors: []
            });
        } else {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: false,
                message: `Failed to send some ${channel}. ${summaryMessage}`,
                statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                errors: [`Failed to send some ${channel}`]
            });
        }
    } catch (error) {
        console.error(`Error sending ${channel}:`, error);
        await activityMiddleware(req, user.id, `Error sending ${channel}`, `${channel}_SEND_ERROR`);

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Internal server error",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { sendMessage };
