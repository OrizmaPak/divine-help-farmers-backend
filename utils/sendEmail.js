// const sgMail = require('@sendgrid/mail');
const Nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");


async function sendEmail(details) {
    // sgMail.setApiKey(process.env.SENDGRID_KEY);

    const { to, subject, text, html } = details;

    const TOKEN = "02a249d084037d5b2395b97a1c708ab2";

    const transport = Nodemailer.createTransport(
      MailtrapTransport({
        token: TOKEN,
      })
    );

    const sender = {
      address: "mailtrap@demomailtrap.com",
      name: "Divine Help Farmers",
    };
    // const recipients = [
    //   to,
    // ];


    const msg = {
        to, // Change to your recipient
        from: sender, // Change to your verified sender
        subject,
        text,
        html
    };

    try {
        await transport
        .sendMail(msg);
        console.log("Email sent");
        return 'true';
    } catch (error) {
        console.error(error);
        return 'false';
    }
}

module.exports = {sendEmail};

