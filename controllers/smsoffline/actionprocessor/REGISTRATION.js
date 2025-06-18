const { sendSmsOffline } = require('../../../utils/sendSms');

async function sendRegistrationInstructions(phone) {
    const message = "To register, please send your details in the following format: 'REGISTER firstname lastname email dateofbirth'. For example, 'REGISTER John Doe john.doe@example.com 1990-01-01'.";
    try {
        const result = await sendSmsOffline(phone, message);
        if (result) {
            console.log('Registration instructions sent successfully');
        } else {
            console.error('Failed to send registration instructions');
        }
    } catch (error) {
        console.error('Error sending registration instructions:', error);
    }
}

module.exports = { sendRegistrationInstructions };
