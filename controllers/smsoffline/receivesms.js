const { StatusCodes } = require("http-status-codes");
// const { activityMiddleware } = require("../../middleware/activity");
const { generateText } = require("../ai/ai");
const { sendUnknownMessageResponse } = require("./actionprocessor/UNKNOWN");
const { sendRegistrationInstructions } = require("./actionprocessor/REGISTRATION");
const { sendPersonalBalance } = require("./actionprocessor/PERSONAL BALANCE");
const { sendTotalAsset } = require("./actionprocessor/SAVINGS TOTAL ASSET");
const { sendSavingsProductBalance } = require("./actionprocessor/SAVINGS PRODUCT BALANCE");
const { sendHelpMessageResponse } = require("./actionprocessor/HELP");
const { sendBranchName } = require("./actionprocessor/WHATS MY BRANCH");
const { getNextMeetingDate } = require("./actionprocessor/NEXT MEETING DATE");

const messageActions = [
    { id: 1, action: 'REGISTRATION' }, // DONE
    { id: 2, action: 'PERSONAL BALANCE' }, // DONE
    { id: 3, action: 'THRIFT BALANCE' }, // DONE
    { id: 4, action: 'SHARES BALANCE' }, // DONE
    { id: 5, action: 'TOTAL ASSET' }, // DONE
    { id: 6, action: 'SEND {{AMOUNT}} TO {{PRODUCT}}' },
    { id: 7, action: 'SEND FROM {{AMOUNT}} FROM {{PRODUCT}} TO {{PRODUCT}}' },
    { id: 8, action: 'NEXT MEETING DATE' },
    { id: 9, action: 'WHATS MY BRANCH' }, // DONE
    { id: 10, action: 'UNKNOWN' }, // DONE
    { id: 11, action: 'HELP'}, // DONE
    { id: 12, action: 'REGISTER {{FIRSTNAME}} {{LASTNAME}} {{EMAIL}}'},
];

const receiveSms = async (req, res) => {
    const user = req.user;
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            status: false,
            message: "Phone number and message are required",
            statuscode: StatusCodes.BAD_REQUEST,
            data: null,
            errors: ["Missing phone number or message"]
        });
    }

    try {
        // Use AI to interpret the message
        const interpretedMessage = await interpretMessage(message);
        console.log('interpretedMessage', typeof interpretedMessage, interpretedMessage);
        const action = messageActions.find(action => action.id == interpretedMessage[0]);

        console.log('action', action);

        if (action) {
            switch (action.id) {
                case 1: // REGISTRATION
                    await sendRegistrationInstructions(phone) 
                    break;
                case 2: // PERSONAL BALANCE
                    await sendPersonalBalance(phone);
                    break;
                case 3: // THRIFT BALANCE
                    await sendSavingsProductBalance(phone, 'THRIFT');
                    break;
                case 4: // SHARES BALANCE
                    await sendSavingsProductBalance(phone, 'SHARES');
                    break;
                case 5: // TOTAL ASSET
                    await sendTotalAsset(phone);
                    break;
                case 6: // SEND {{AMOUNT}} TO {{PRODUCT}}
                    // Call the send amount to product function using action.action
                    break;
                case 7: // SEND FROM {{AMOUNT}} FROM {{PRODUCT}} TO {{PRODUCT}}
                    // Call the send from product to product function using action.action
                    break;
                case 8: // NEXT MEETING DATE
                    await getNextMeetingDate(phone);
                    break;
                case 9: // WHAT BRANCH AM I
                    await sendBranchName(phone);
                    break;
                case 10: // UNKNOWN
                    await sendUnknownMessageResponse(phone);
                    break;
                case 11: // HELP
                    await sendHelpMessageResponse(phone);
                    break;
                case 11: // REGISTER A USER

                    break;
            }

           // await activityMiddleware(req, user.id, 'SMS received and processed successfully', 'SMS');

            return res.status(StatusCodes.OK).json({
                status: true,
                message: "SMS processed successfully",
                statuscode: StatusCodes.OK,
                data: null,
                errors: []
            });
        } else {
            return res.status(StatusCodes.BAD_REQUEST).json({
                status: false,
                message: "Invalid message format",
                statuscode: StatusCodes.BAD_REQUEST,
                data: null,
                errors: []
            });
        }
    } catch (error) {
        console.error('Unexpected Error:', error);
        // await activityMiddleware(req, user.id, 'An unexpected error occurred processing SMS', 'SMS');

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "An unexpected error occurred",
            statuscode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            errors: [error.message]
        });
    }
};

async function interpretMessage(message) {
  try {
    const prompt = `Interpret the following message and return only a JavaScript array in this exact format: ['id', 'action'].

    Match the message to the most suitable action from the list below. If an action includes placeholders like {{...}} (e.g., {{AMOUNT}}), replace the placeholders with actual values from the message — but only if all required details are clearly present.
    
    For actions with id 6 and 7, if the message includes both an amount and a product, replace the placeholders accordingly. For example, if the message is "send 3k to my shares", the correct result would be ['6', 'SEND 3000 TO THRIFT'].
    
    Also, recognize shorthand notations such as:
    - "k" for thousand (e.g., "3k" = 3000)
    
    **Important:** Return only the array. Do not include any code block, explanation, or label.
    
    If no suitable action matches the message, return ['10', 'UNKNOWN'].
    
    Actions: ${messageActions.map(action => `[${action.id}, '${action.action}']`).join(', ')}.
    Message: "${message}"`;
    
    const actionResponse = await generateText(prompt);
    console.log('actionResponse', typeof actionResponse);
    const action = JSON.parse(actionResponse.replace(/'/g, '"'));

    return action;
  } catch (error) {
    console.error("Error interpreting message:", error);
    throw new Error("Failed to interpret message");
  }
}

module.exports = { receiveSms };
