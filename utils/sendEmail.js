const Nodemailer = require("nodemailer");
const pg = require("../db/pg");

// async function sendEmail(details) {
//     const { to, subject, text, html } = details;

//     const transport = Nodemailer.createTransport({
//         service: 'gmail',
//         host: 'smtp.gmail.com',
//         port: 587,
//         secure: false,
//         auth: {
//             user: process.env.GMAIL_USER, // Your Gmail address
//             pass: process.env.GMAIL_PASS  // Your Gmail password or App Password
//         }
//     });

//     const msg = {
//         to, // Recipient
//         from: process.env.GMAIL_USER, // Your verified Gmail address
//         subject,
//         text,
//         html
//     };

//     try {
//         await transport.sendMail(msg);
//         console.log("Email sent");
//         return true;
//     } catch (error) {
//         console.error(error);
//         return false
//     }
// }

// const pg = require('../db/pg');

async function sendEmail(details) {
    const { to, html } = details;

    try {
        const tempEmailQuery = {
            text: `INSERT INTO divine."tempemail" (email, message, status) VALUES ($1, $2, $3)`,
            values: [to, html, "ACTIVE"]
        };
        await pg.query(tempEmailQuery);

        console.log('Email details saved to tempemail:', { to, html });

        // Do not send the email, only save to tempemail
        return true;
    } catch (err) {
        console.error('Database error:', err);
        return false;
    }
}

async function sendBulkEmails(emailDetailsArray) {
    const transport = Nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.GMAIL_USER, // Your Gmail address
            pass: process.env.GMAIL_PASS  // Your Gmail password or App Password
        }
    });

    try {
        if (emailDetailsArray.length === 0) {
            console.log("No emails to send");
            return false;
        }

        const primaryRecipient = emailDetailsArray[0].to;
        const bccRecipients = emailDetailsArray.slice(1).map(details => details.to);

        const { subject, text, html } = emailDetailsArray[0];
        const msg = {
            to: primaryRecipient, // Primary recipient
            from: process.env.GMAIL_USER, // Your verified Gmail address
            bcc: bccRecipients, // BCC the rest
            subject,
            text,
            html
        };

        await transport.sendMail(msg);
        console.log(`Email sent to ${primaryRecipient} and BCC'd to others`);
        return true;
    } catch (error) {
        console.error('Error sending bulk emails:', error);
        return false;
    }
}




// async function sendEmail(details) {
//     // sgMail.setApiKey(process.env.SENDGRID_KEY);

//     const { to, subject, text, html } = details;

//     const TOKEN = "02a249d084037d5b2395b97a1c708ab2";

//     const transport = Nodemailer.createTransport(
//       MailtrapTransport({
//         token: TOKEN,
//       })
//     );

//     const sender = {
//       address: "mailtrap@demomailtrap.com",
//       name: "Divine Help Farmers",
//     };
//     // const recipients = [
//     //   to,
//     // ];


//     const msg = {
//         to, // Change to your recipient
//         from: sender, // Change to your verified sender
//         subject,
//         text,
//         html
//     };

//     try {
//         await transport
//         .sendMail(msg);
//         console.log("Email sent");
//         return 'true';
//     } catch (error) {
//         console.error(error);
//         return 'false';
//     }
// }

module.exports = {sendEmail, sendBulkEmails};

