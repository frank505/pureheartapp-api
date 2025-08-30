import nodemailer from 'nodemailer';
import { emailConfig, appConfig } from '../config/environment';
import { IEmailService, IEmailTemplateData } from '../types/auth';
import { User } from '../models';
import { Resend } from 'resend';

/**
 * Email service for sending authentication-related emails
 * This service handles password reset, email verification, and welcome emails
 */

/**
 * Create nodemailer transporter with configuration
 */
const createTransporter = () => {
  const resend = new Resend(emailConfig.auth.pass);
  return resend;
};

/**
 * Email service implementation
 */
export class EmailService implements IEmailService {
  private transporter: Resend;

  constructor() {
    this.transporter = createTransporter();
  }

  async sendWaitingListThankYouEmail(email: string): Promise<boolean> {
    try {
      const subject = `${appConfig.name} - Thanks for joining the waiting list`;
      const html = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; background: #f7f7f7; padding: 20px;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;padding:20px;">
            <h2 style="margin-top:0;">${appConfig.name}</h2>
            <p>Thanks for signing up! You're on our waiting list. We'll notify you as soon as we're ready.</p>
            <p>In the meantime, keep an eye on your inbox for updates.</p>
            <p style="color:#666">Blessings,<br/>The ${appConfig.name} Team</p>
          </div>
        </body></html>
      `;
      const text = `Thanks for signing up! You're on our waiting list for ${appConfig.name}. We'll notify you as soon as we're ready.`;
      const mailOptions = { from: emailConfig.from, to: email, subject, html, text } as any;
      const result = await this.transporter.emails.send(mailOptions);

      // const result = await this.transporter.sendMail(mailOptions);
      console.log('Waiting list thank you email sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending waiting list thank you email:', error);
      return false;
    }
  }

  async sendFastStartedEmail(email: string, partnerName: string, fasterName: string): Promise<boolean> {
    try {
      const subject = `${appConfig.name} - ${fasterName} just started a fast`;
      const html = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; background: #f7f7f7; padding: 20px;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;padding:20px;">
            <h2 style="margin-top:0;">${appConfig.name}</h2>
            <p>Hi ${partnerName},</p>
            <p><strong>${fasterName}</strong> just started a fast and has invited you to keep them accountable. Please keep them in prayer and send encouragement.</p>
            <p>Open the app to check in on them and offer support.</p>
            <p style="color:#666">Blessings,<br/>The ${appConfig.name} Team</p>
          </div>
        </body></html>
      `;
      const text = `${fasterName} just started a fast and invited you to keep them accountable. Please keep them in prayer and send encouragement.\n\n- ${appConfig.name}`;
      const mailOptions = { from: emailConfig.from, to: email, subject, html, text } as any;
      const result = await this.transporter.emails.send(mailOptions);
      console.log('Fast started email sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending fast started email:', error);
      return false;
    }
  }
  
  async sendAccountabilityInviteEmail(
    email: string,
    inviterName: string,
    inviteCode: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `${appConfig.name} - You're invited to be an accountability partner`,
        html: this.getAccountabilityInviteTemplate(inviterName, inviteCode),
        text: this.getAccountabilityInviteTextTemplate(inviterName, inviteCode),
      };
      const result = await this.transporter.emails.send(mailOptions);
      console.log('Accountability invite email sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending accountability invite email:', error);
      return false;
    }
  }

  /**
   * Send group invite email with invite code
   */
  async sendGroupInviteEmail(email: string, groupName: string, inviteCode: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `${appConfig.name} - You're invited to join ${groupName}`,
        html: this.getGroupInviteTemplate(groupName, inviteCode),
        text: this.getGroupInviteTextTemplate(groupName, inviteCode),
      };
      const result = await this.transporter.emails.send(mailOptions);
      console.log('Group invite email sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending group invite email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   * @param email - Recipient email address
   * @param resetUrl - Password reset URL with token
   * @param userData - User data for personalization
   * @returns Promise<boolean> - Success status
   */
  async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    userData: IEmailTemplateData
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `${appConfig.name} - Password Reset Request`,
        html: this.getPasswordResetTemplate(resetUrl, userData),
        text: this.getPasswordResetTextTemplate(resetUrl, userData),
      };

      const result = await this.transporter.emails.send(mailOptions);
      console.log('Password reset email sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send email verification email
   * @param email - Recipient email address
   * @param verificationUrl - Email verification URL with token
   * @param userData - User data for personalization
   * @returns Promise<boolean> - Success status
   */
  async sendEmailVerificationEmail(
    email: string,
    verificationUrl: string,
    userData: IEmailTemplateData
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `${appConfig.name} - Verify Your Email Address`,
        html: this.getEmailVerificationTemplate(verificationUrl, userData),
        text: this.getEmailVerificationTextTemplate(verificationUrl, userData),
      };

      const result = await this.transporter.emails.send(mailOptions);
      console.log('Email verification email sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending email verification email:', error);
      return false;
    }
  }

  /**
   * Send welcome email after successful registration
   * @param email - Recipient email address
   * @param userData - User data for personalization
   * @returns Promise<boolean> - Success status
   */
  async sendWelcomeEmail(
    email: string,
    userData: IEmailTemplateData
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `Welcome to ${appConfig.name}!`,
        html: this.getWelcomeTemplate(userData),
        text: this.getWelcomeTextTemplate(userData),
      };

      const result = await this.transporter.emails.send(mailOptions);
      console.log('Welcome email sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Password reset email HTML template
   */
  private getPasswordResetTemplate(resetUrl: string, userData: IEmailTemplateData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - ${userData.appName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${userData.appName}</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${userData.firstName},</p>
            <p>We received a request to reset your password for your ${userData.appName} account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <div class="warning">
              <p><strong>Security Notice:</strong></p>
              <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
          </div>
          <div class="footer">
            <p>This email was sent by ${userData.appName}</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password reset email text template
   */
  private getPasswordResetTextTemplate(resetUrl: string, userData: IEmailTemplateData): string {
    return `
Password Reset Request - ${userData.appName}

Hello ${userData.firstName},

We received a request to reset your password for your ${userData.appName} account.

Please click the following link to reset your password:
${resetUrl}

SECURITY NOTICE:
- This link will expire in 1 hour for security reasons
- If you didn't request this password reset, please ignore this email
- Never share this link with anyone

If you're having trouble with the link, copy and paste it into your web browser.

This email was sent by ${userData.appName}
If you didn't request this password reset, please ignore this email.
    `;
  }

  /**
   * Email verification HTML template
   */
  private getEmailVerificationTemplate(verificationUrl: string, userData: IEmailTemplateData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - ${userData.appName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${userData.appName}</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello ${userData.firstName},</p>
            <p>Thank you for registering with ${userData.appName}! To complete your registration, please verify your email address.</p>
            <p>Click the button below to verify your email:</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p><strong>This verification link will expire in 24 hours.</strong></p>
            <p>Once verified, you'll have full access to all ${userData.appName} features.</p>
          </div>
          <div class="footer">
            <p>This email was sent by ${userData.appName}</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Email verification text template
   */
  private getEmailVerificationTextTemplate(verificationUrl: string, userData: IEmailTemplateData): string {
    return `
Verify Your Email Address - ${userData.appName}

Hello ${userData.firstName},

Thank you for registering with ${userData.appName}! To complete your registration, please verify your email address.

Please click the following link to verify your email:
${verificationUrl}

This verification link will expire in 24 hours.

Once verified, you'll have full access to all ${userData.appName} features.

This email was sent by ${userData.appName}
If you didn't create an account, please ignore this email.
    `;
  }

  /**
   * Welcome email HTML template
   */
  private getWelcomeTemplate(userData: IEmailTemplateData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${userData.appName}!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          .features { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${userData.appName}!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userData.firstName},</h2>
            <p>Welcome to the ${userData.appName} community! We're excited to have you on board.</p>
            <p>Your account has been successfully created and you're ready to start your journey with us.</p>
            <div class="features">
              <h3>What you can do now:</h3>
              <ul>
                <li>Complete your profile setup</li>
                <li>Explore recovery resources</li>
                <li>Connect with the community</li>
                <li>Track your progress</li>
              </ul>
            </div>
            <p>If you have any questions or need support, don't hesitate to reach out to our team.</p>
            <p>Blessings on your recovery journey!</p>
          </div>
          <div class="footer">
            <p>Thank you for joining ${userData.appName}</p>
            <p>Together, we can overcome anything through faith and community.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Welcome email text template
   */
  private getWelcomeTextTemplate(userData: IEmailTemplateData): string {
    return `
Welcome to ${userData.appName}!

Hello ${userData.firstName},

Welcome to the ${userData.appName} community! We're excited to have you on board.

Your account has been successfully created and you're ready to start your journey with us.

What you can do now:
- Complete your profile setup
- Explore recovery resources
- Connect with the community
- Track your progress

If you have any questions or need support, don't hesitate to reach out to our team.

Blessings on your recovery journey!

Thank you for joining ${userData.appName}
Together, we can overcome anything through faith and community.
    `;
  }

  private getGroupInviteTemplate(groupName: string, inviteCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to ${groupName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 20px 0; }
          .code { font-size: 24px; font-weight: bold; letter-spacing: 2px; background: #f8f9fa; padding: 10px 15px; border-radius: 6px; display: inline-block; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${appConfig.name}</h1>
          </div>
          <div class="content">
            <h2>You're invited to join ${groupName}</h2>
            <p>Use the invite code below in the app to join the group:</p>
            <p class="code">${inviteCode}</p>
            <p>If you don't have the app yet, install it and then use the code to join.</p>
          </div>
          <div class="footer">
            <p>This email was sent by ${appConfig.name}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getGroupInviteTextTemplate(groupName: string, inviteCode: string): string {
    return `
You're invited to join ${groupName} on ${appConfig.name}

Use this invite code in the app to join:
${inviteCode}

If you don't have the app yet, install it and then use the code to join.
`;
  }

  private getAccountabilityInviteTemplate(inviterName: string, inviteCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to be an accountability partner</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 20px 0; }
          .code { font-size: 24px; font-weight: bold; letter-spacing: 2px; background: #f8f9fa; padding: 10px 15px; border-radius: 6px; display: inline-block; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${appConfig.name}</h1>
          </div>
          <div class="content">
            <h2>You're invited to be an accountability partner with ${inviterName}</h2>
            <p>Use the invite code below in the app to accept the invitation:</p>
            <p class="code">${inviteCode}</p>
            <p>If you don't have the app yet, install it from the app store, create an account, and then use the code to accept the invitation.</p>
          </div>
          <div class="footer">
            <p>This email was sent by ${appConfig.name}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getAccountabilityInviteTextTemplate(inviterName: string, inviteCode: string): string {
    return `
You're invited to be an accountability partner with ${inviterName} on ${appConfig.name}

Use this invite code in the app to accept the invitation:
${inviteCode}

If you don't have the app yet, install it from the app store, create an account, and then use the code to accept the invitation.
`;
  }

  /**
   * Send password changed notification email
   * @param email - Recipient email address
   * @param userData - User data for personalization
   * @param timestamp - When the password was changed
   * @param ipAddress - IP address from where the change was made
   * @param userAgent - User agent of the browser/device
   * @returns Promise<boolean> - Success status
   */
  async sendPasswordChangedNotification(
    email: string,
    userData: IEmailTemplateData,
    timestamp: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `${appConfig.name} - Password Changed Successfully`,
        html: this.getPasswordChangedTemplate(userData, timestamp, ipAddress, userAgent),
        text: this.getPasswordChangedTextTemplate(userData, timestamp, ipAddress, userAgent),
      };

      const result = await this.transporter.emails.send(mailOptions);
      console.log('Password changed notification sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending password changed notification:', error);
      return false;
    }
  }

  /**
   * Password changed notification HTML template
   */
  private getPasswordChangedTemplate(
    userData: IEmailTemplateData, 
    timestamp: string, 
    ipAddress?: string, 
    userAgent?: string
  ): string {
    const formattedDate = new Date(timestamp).toLocaleString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed - ${userData.appName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .content { padding: 20px 0; }
          .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 10px; border-radius: 5px; margin: 20px 0; }
          .security-info { background-color: #e2e3e5; border: 1px solid #d6d8db; color: #383d41; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${userData.appName}</h1>
          </div>
          <div class="content">
            <h2>Password Changed Successfully</h2>
            <p>Hello ${userData.firstName},</p>
            <div class="success">
              <p><strong>✅ Your password has been changed successfully!</strong></p>
            </div>
            <p>This email confirms that your ${userData.appName} account password was changed on <strong>${formattedDate}</strong>.</p>
            <div class="security-info">
              <h3>Security Details:</h3>
              <ul>
                <li><strong>Date:</strong> ${formattedDate}</li>
                ${ipAddress ? `<li><strong>IP Address:</strong> ${ipAddress}</li>` : ''}
                ${userAgent ? `<li><strong>Device:</strong> ${userAgent}</li>` : ''}
              </ul>
            </div>
            <p><strong>If you did not make this change:</strong></p>
            <ul>
              <li>Your account may have been compromised</li>
              <li>Please contact our support team immediately</li>
              <li>Consider enabling two-factor authentication for added security</li>
            </ul>
            <p>If you made this change, no further action is required.</p>
          </div>
          <div class="footer">
            <p>This is an automated security notification from ${userData.appName}</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password changed notification text template
   */
  private getPasswordChangedTextTemplate(
    userData: IEmailTemplateData, 
    timestamp: string, 
    ipAddress?: string, 
    userAgent?: string
  ): string {
    const formattedDate = new Date(timestamp).toLocaleString();
    
    return `
Password Changed Successfully - ${userData.appName}

Hello ${userData.firstName},

Your password has been changed successfully!

This email confirms that your ${userData.appName} account password was changed on ${formattedDate}.

Security Details:
- Date: ${formattedDate}
${ipAddress ? `- IP Address: ${ipAddress}` : ''}
${userAgent ? `- Device: ${userAgent}` : ''}

If you did not make this change:
- Your account may have been compromised
- Please contact our support team immediately
- Consider enabling two-factor authentication for added security

If you made this change, no further action is required.

This is an automated security notification from ${userData.appName}
Please do not reply to this email.
    `;
  }

 
}

// Create and export email service instance
export const emailService = new EmailService();