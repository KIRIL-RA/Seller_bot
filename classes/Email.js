const EmailSettings = require("./settings/EmailOptions.json");
const nodemailer = require('nodemailer');

/**
 * Sending only text e-mail
 * @param {*} email 
 * @param {*} text 
 * @param {*} subject 
 */
async function SendOnlyTextMail(fromName, email, text, subject){
    // Transporter settings
    const transporter = nodemailer.createTransport({
        host: EmailSettings.HOST,
        port: EmailSettings.PORT,
        auth: {
            user: EmailSettings.USER,
            pass: EmailSettings.PASSWORD
        }
    });

    // Setting up mail message to user
    const mailOptionsToClient = {
        from: `${fromName} <${EmailSettings.USER}>`, // sender address
        to: email, // list of receivers
        subject: subject, // Subject line
        html: text,
    };

    // Sending message
    await transporter.sendMail(mailOptionsToClient);
}

module.exports = {SendOnlyTextMail};