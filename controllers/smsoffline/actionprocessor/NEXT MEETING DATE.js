 
const { sendSmsOffline } = require('../../../utils/sendSms');
const pg = require('../../../db/pg');
const { getTransactionPeriod } = require('../../../utils/datecode');

async function getNextMeetingDate(phone) {
    try {
        // Get the user details using the phone number
        const userQuery = {
            text: `SELECT firstname, branch FROM divine."User" WHERE phone = $1`,
            values: [phone]
        };
        const { rows: userDetails } = await pg.query(userQuery);

        if (userDetails.length === 0) {
            const message = "You are not registered. Please register to access your branch meeting details.";
            await sendSmsOffline(phone, message);
            console.error("User not found");
            return;
        }

        const { firstname, branch: branchId } = userDetails[0];

        // Fetch branch details from the Branch table
        const branchQuery = {
            text: `SELECT branch, address, meetingfrequency FROM divine."Branch" WHERE id = $1`,
            values: [branchId]
        };
        const { rows: branchDetails } = await pg.query(branchQuery);

        if (branchDetails.length === 0) {
            const message = "Branch details not found.";
            await sendSmsOffline(phone, message);
            console.error("Branch not found");
            return;
        }

        const { branch, address, meetingfrequency } = branchDetails[0];
        const frequency = meetingfrequency || "D31T";

        // Get the transaction period end date
        const { endDate } = getTransactionPeriod(frequency);

        // Calculate the time difference
        const now = new Date();
        const endDateObj = new Date(endDate);
        const timeDiff = endDateObj - now;
        const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;

        // Format the end date
        const day = endDateObj.getDate();
        const month = endDateObj.toLocaleString('default', { month: 'long' });
        const year = endDateObj.getFullYear();
        const formattedDate = `${day}${getOrdinalSuffix(day)} ${month} ${year}`;

        // Form the message
           const message = `Hi ${firstname}, your DHF ${branch.toUpperCase()} branch meets in ${weeks} weeks and ${remainingDays} days at ${address}. Date: ${formattedDate}. Looking forward to seeing you!`;

        // Send the message over SMS
        const result = await sendSmsOffline(phone, message);
        if (result) {
            console.log('Next meeting date message sent successfully');
        } else {
            console.error('Failed to send next meeting date message');
        }
    } catch (error) {
        console.error('Unexpected Error:', error);
    }
}

function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th'; // covers 11th to 19th
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

module.exports = { getNextMeetingDate };
