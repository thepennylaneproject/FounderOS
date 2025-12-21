import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

export interface EmailMessage {
    id?: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    date?: Date;
    status?: string;
}

export class EmailClient {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'mailserver',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendEmail(message: EmailMessage, trackingId?: string): Promise<void> {
        let html = message.body.replace(/\n/g, '<br>');

        if (trackingId) {
            const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tracking/open/${trackingId}`;
            html += `<img src="${trackingUrl}" width="1" height="1" style="display:none" alt="" />`;
        }

        await this.transporter.sendMail({
            from: message.from,
            to: message.to,
            subject: message.subject,
            text: message.body,
            html: html,
        });
    }

    async fetchInbox(config: { host: string; port: number; user: string; pass: string }) {
        const client = new ImapFlow({
            host: config.host,
            port: config.port,
            secure: true,
            auth: {
                user: config.user,
                pass: config.pass
            },
            logger: false
        });

        await client.connect();
        await client.mailboxOpen('INBOX');
        const messages = [];

        try {
            for await (const message of client.fetch('1:10', { envelope: true })) {
                if (message.envelope) {
                    messages.push({
                        id: message.uid.toString(),
                        from: message.envelope.from?.[0]?.address || 'unknown',
                        subject: message.envelope.subject || '(no subject)',
                        date: message.envelope.date
                    });
                }
            }
        } finally {
            await client.logout();
        }

        await client.logout();
        return messages;
    }
}

export const emailClient = new EmailClient();
