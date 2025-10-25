import { sendWelcomeEmail } from '@/lib/nodemailer';
import nodemailer from 'nodemailer'
import { WELCOME_EMAIL_TEMPLATE } from './templates';
export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    }
})
export const sendWelcomeEmail = async ({email, name, intro}:WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace('{{name}}', name).replace('{{intro}}', intro);
    const mailOptions = {
        from: "TradeX Support",
        to: email,
        subject: 'Welcome to TradeX - your stock market toolkit is ready!',
        text: `Hi ${name},\n\n${intro}\n\nBest regards,\nThe TradeX Team`,
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
}