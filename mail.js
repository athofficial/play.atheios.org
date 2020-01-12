var nodemailer = require('nodemailer');
const fs = require('fs');


class Mail {
    constructor() {
        console.log("Pass: %s, %s",config.NODEMAIL_PASS, config.NODEMAIL_HOST);
        this.smtpTransport = nodemailer.createTransport({
            host: config.NODEMAIL_HOST,
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: config.NODEMAIL_USER, // generated user
                pass: config.NODEMAIL_PASS // generated password
            }
        });
    }
    async sendMail(to, subject, html) {
        var mailOptions={
            from: 'play@atheios.org',
            to: to,
            subject: subject,
            html: html
        }
        if (debugon)
            console.log(">>>> DEBUG: ",mailOptions);
        let info=await this.smtpTransport.sendMail(mailOptions);
        if (debugon) {
            console.log(">>>> DEBUG: ", mailOptions);
            console.log("Message sent: %s", info.messageId);
            // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
        }
    }
    async sendMailTemplate(tolist, templatenr) {
        var subject;
        var html;
        var text;
        var i;
        var error=false;


        switch (templatenr) {
            case 1:
                subject="Bloxxchain: New all time high!";
                html= fs.readFileSync(__dirname + '/mail_templates/all_time_high.html', 'utf8');
                text= fs.readFileSync(__dirname + '/mail_templates/all_time_high.txt', 'utf8');
                break;
            case 2:
                subject="New round, new chance to get onto the first position";
                html= fs.readFileSync(__dirname + '/mail_templates/newperiode.html', 'utf8');
                text= fs.readFileSync(__dirname + '/mail_templates/newperiode.txt', 'utf8');
                break;
            default:
                error=true;
        }
        if (error) {
            if (debugon)
                console.log(">>>> DEBUG: (fn=sendMailTemplate) Template not defined")
        } else {
            for (i=0;i<tolist.length;i++) {
                var mailOptions = {
                    from: 'master@bloxxchain.info',
                    to: tolist[i],
                    subject: subject,
                    text: text,
                    html: html
                }
                let info = await this.smtpTransport.sendMail(mailOptions);
                if (debugon) {
                    console.log("Message sent to: %s with mailid %s", tolist[i], info.messageId);
                    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
                }
            }
        }
    }

}

module.exports = Mail;