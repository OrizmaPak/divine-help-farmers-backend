const { StatusCodes } = require("http-status-codes");
const { sendEmail } = require("../../utils/sendEmail"); // Assuming sendEmail is a utility function for sending emails

const paystackWebhook = async (req, res) => {
    try {
        const event = req.body;

        // Log the received event
        console.log('Received Paystack Event:', event);

        // Send the event and its details to jovisamblue@gmail.com
        const emailSubject = `New Paystack Event: ${event.event}`;
        const emailBody = `
            <h1>Paystack Event Received</h1>
            <p>Event Type: ${event.event}</p>
            <pre>${JSON.stringify(event, null, 2)}</pre>
        `;
        await sendEmail({ to: 'jovisamblue@gmail.com', subject: emailSubject, text: '', html: emailBody });

        return res.status(StatusCodes.OK).json({
            status: true,  
            message: "Event received successfully",
            statuscode: StatusCodes.OK,
            data: null, 
            errors: []
        });
    } catch (error) { 
        console.error('Error processing Paystack event:', error);

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An error occurred while processing the event",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

module.exports = { paystackWebhook };
