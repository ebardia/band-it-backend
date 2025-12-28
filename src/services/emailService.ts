import nodemailer from 'nodemailer';
import { config } from '../config/env';
import logger from '../utils/logger';

// Email service
class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Only initialize if SendGrid API key is provided
    if (config.sendgridApiKey && config.fromEmail) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: config.sendgridApiKey,
        },
      });
    } else {
      logger.info('Email service not configured - emails will be logged to console');
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      // Development mode - just log to console
      logger.info('📧 EMAIL (Console Mode):', {
        to,
        subject,
        preview: html.substring(0, 200) + '...',
      });
      return;
    }

    try {
      await this.transporter.sendMail({
        from: config.fromEmail!,
        to,
        subject,
        html,
      });
      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  // Welcome email
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const subject = 'Welcome to BAND IT!';
    const html = `
      <h1>Welcome to BAND IT, ${firstName}!</h1>
      <p>Your account has been created successfully.</p>
      <p>You can now create or join bands and start collaborating.</p>
      <p>- The BAND IT Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  // Password reset email
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password/${resetToken}`;
    const subject = 'Reset Your Password - BAND IT';
    const html = `
      <h1>Password Reset Request</h1>
      <p>Hi ${firstName},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>- The BAND IT Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }

  // Member invitation email
  async sendInvitationEmail(
    email: string,
    orgName: string,
    inviterName: string,
    inviteToken: string
  ): Promise<void> {
    const inviteUrl = `${config.frontendUrl}/invite/${inviteToken}`;
    const subject = `You've been invited to join ${orgName} on BAND IT`;
    const html = `
      <h1>You're Invited!</h1>
      <p>${inviterName} has invited you to join <strong>${orgName}</strong> on BAND IT.</p>
      <p>Click the link below to accept the invitation:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>This invitation will expire in 7 days.</p>
      <p>- The BAND IT Team</p>
    `;
    await this.sendEmail(email, subject, html);
  }
}

export default new EmailService();
