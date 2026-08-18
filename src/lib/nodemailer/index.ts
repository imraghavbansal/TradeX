import nodemailer from 'nodemailer';
import {
    WELCOME_EMAIL_TEMPLATE,
    NEWS_SUMMARY_EMAIL_TEMPLATE,
    STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
    STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    }
})

const applyBranding = (html: string) =>
    html
        .replaceAll('{{siteUrl}}', SITE_URL)
        .replaceAll('{{year}}', String(new Date().getFullYear()));

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    const htmlTemplate = applyBranding(
        WELCOME_EMAIL_TEMPLATE
            .replace('{{name}}', name)
            .replace('{{intro}}', intro)
    );

    const mailOptions = {
        from: "TradeX Team",
        to: email,
        subject: `Welcome to TradeX - your stock market toolkit is ready!`,
        text: 'Thanks for joining TradeX',
        html: htmlTemplate,
    }

    await transporter.sendMail(mailOptions);
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<void> => {
    const htmlTemplate = applyBranding(
        NEWS_SUMMARY_EMAIL_TEMPLATE
            .replace('{{date}}', date)
            .replace('{{newsContent}}', newsContent)
    );

    const mailOptions = {
        from: "TradeX News",
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: `Today's market news summary from TradeX`,
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
};

type StockAlertEmailData = {
    email: string;
    symbol: string;
    company: string;
    currentPrice: string;
    targetPrice: string;
    timestamp: string;
};

const fillStockAlertTemplate = (template: string, data: StockAlertEmailData) =>
    applyBranding(
        template
            .replaceAll('{{symbol}}', data.symbol)
            .replaceAll('{{company}}', data.company)
            .replaceAll('{{currentPrice}}', data.currentPrice)
            .replaceAll('{{targetPrice}}', data.targetPrice)
            .replaceAll('{{timestamp}}', data.timestamp)
    );

export const sendStockAlertUpperEmail = async (data: StockAlertEmailData): Promise<void> => {
    const mailOptions = {
        from: "TradeX Alerts",
        to: data.email,
        subject: `📈 ${data.symbol} crossed above ${data.targetPrice}`,
        text: `${data.symbol} (${data.company}) is now at ${data.currentPrice}, above your target of ${data.targetPrice}.`,
        html: fillStockAlertTemplate(STOCK_ALERT_UPPER_EMAIL_TEMPLATE, data),
    };

    await transporter.sendMail(mailOptions);
};

export const sendStockAlertLowerEmail = async (data: StockAlertEmailData): Promise<void> => {
    const mailOptions = {
        from: "TradeX Alerts",
        to: data.email,
        subject: `📉 ${data.symbol} dropped below ${data.targetPrice}`,
        text: `${data.symbol} (${data.company}) is now at ${data.currentPrice}, below your target of ${data.targetPrice}.`,
        html: fillStockAlertTemplate(STOCK_ALERT_LOWER_EMAIL_TEMPLATE, data),
    };

    await transporter.sendMail(mailOptions);
};
