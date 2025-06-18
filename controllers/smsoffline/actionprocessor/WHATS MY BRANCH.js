 const { sendSmsOffline } = require('../../../utils/sendSms');
const pg = require('../../../db/pg');

async function sendBranchName(phone) {
    try {
        // Query to get the user's branch ID based on their phone number
        const userQuery = {
            text: `SELECT firstname, lastname, branch FROM divine."User" WHERE phone = $1`,
            values: [phone]
        };
        const { rows: users } = await pg.query(userQuery);

        if (users.length === 0) {
            // If user does not exist, send a message about the user not being registered
            const message = "You are not registered. Please register to access your branch information.";
            const result = await sendSmsOffline(phone, message);
            if (result) {
                console.log('User not registered message sent successfully');
            } else {
                console.error('Failed to send user not registered message');
            }
            return;
        }

        const user = users[0];
        const branchId = user.branch; // Get the user's branch ID
        const userName = `${user.firstname}`; // Get the user's name

        // Query to get the branch details from the Branch table using the branch ID
        const branchQuery = {
            text: `SELECT branch, address, userid FROM divine."Branch" WHERE id = $1`,
            values: [branchId]
        };
        const { rows: branches } = await pg.query(branchQuery);

        if (branches.length === 0) {
            // If branch does not exist, send a message about the branch not being found
            const message = "Branch information not found.";
            const result = await sendSmsOffline(phone, message);
            if (result) {
                console.log('Branch not found message sent successfully');
            } else {
                console.error('Failed to send branch not found message');
            }
            return;
        }

        const branchName = branches[0].branch; // Get the branch name
        const branchAddress = branches[0].address; // Get the branch address
        const branchSupervisorId = branches[0].userid; // Get the branch supervisor ID

        // If the branch has a supervisor, get their name and phone number
        let supervisorName = 'No branch supervisor for now';
        let supervisorPhone = '';
        if (branchSupervisorId) {
            const supervisorQuery = {
                text: `SELECT firstname, lastname, phone FROM divine."User" WHERE id = $1`,
                values: [branchSupervisorId]
            };
            const { rows: supervisors } = await pg.query(supervisorQuery);
            if (supervisors.length > 0) {
                supervisorName = `${supervisors[0].firstname} ${supervisors[0].lastname}`;
                supervisorPhone = supervisors[0].phone;
            }
        }

        // Construct the message with branch details and supervisor information
         let branchMessage = `Hello ${userName},\n`;
        branchMessage += `Your DHF Branch is: ${branchName}\n`;
        branchMessage += `Address:${branchAddress}\n`;
        branchMessage += `Supervisor:${supervisorName}\n`;
        if (supervisorPhone) {
            branchMessage += `Supervisor's phone:${supervisorPhone}\n`;
        }

        // Send the branch details over SMS
        const result = await sendSmsOffline(phone, branchMessage);
        if (result) {
            console.log('Branch details sent successfully');
        } else {
            console.error('Failed to send branch details');
        }
    } catch (error) {
        console.error('Error processing branch details:', error);
    }
}

module.exports = { sendBranchName };