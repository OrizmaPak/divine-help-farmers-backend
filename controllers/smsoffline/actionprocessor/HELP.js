const { sendSmsOffline } = require('../../../utils/sendSms');

 async function sendHelpMessageResponse(phone) {
    const message = "You can ask about the following: \n- REGISTRATION \n- PERSONAL BALANCE \n- THRIFT BALANCE \n- SHARES BALANCE \n- TOTAL ASSET \n- SENDING MONEY BETWEEN YOUR ACCOUNTS \n- NEXT MEETING DATE \n- YOUR BRANCH. For more information, please contact support.";
    try {
        const result = await sendSmsOffline(phone, message);
        if (result) {
            console.log('Help message response sent successfully');
        } else {
            console.error('Failed to send help message response');
        }
    } catch (error) {
        console.error('Error sending help message response:', error);
    }
}

module.exports = { sendHelpMessageResponse };
