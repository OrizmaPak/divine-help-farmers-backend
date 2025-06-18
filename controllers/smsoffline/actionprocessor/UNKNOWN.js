const { sendSmsOffline } = require('../../../utils/sendSms');

async function sendUnknownMessageResponse(phone) {
    const message = "We could not understand your message. Please ensure your message is clear and related to account activities, or type 'help' to know the list of things you can do.";
    try {
        const result = await sendSmsOffline(phone, message);
        if (result) {
            console.log('Unknown message response sent successfully');
        } else {
            console.error('Failed to send unknown message response');
        }
    } catch (error) {
        console.error('Error sending unknown message response:', error);
    }
}

module.exports = { sendUnknownMessageResponse };
