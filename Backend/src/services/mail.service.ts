import * as nodemailer from 'nodemailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: { user, pass },
      });
    } else {
      this.logger.warn(
        'SMTP is not configured. Password reset emails will be logged only.',
      );
    }
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const baseUrl =
      process.env.RESET_PASSWORD_URL_BASE ?? 'medivoice://reset-password';
    const resetLink = `${baseUrl}?token=${encodeURIComponent(token)}`;
    const mailOptions = {
      from: process.env.SMTP_FROM ?? 'MediVoice <noreply@medivoice.local>',
      to,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Use the link or token below to reset your password:</p>
<p><a href="${resetLink}">Reset Password</a></p>
<p>Reset token: <code>${token}</code></p>`,
    };

    if (!this.transporter) {
      this.logger.log(
        `Password reset requested for ${to}. Token (dev only): ${token}`,
      );
      return;
    }

    await this.transporter.sendMail(mailOptions);
  }
}
