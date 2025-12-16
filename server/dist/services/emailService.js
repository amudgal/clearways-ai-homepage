"use strict";
// Email Service
// Handles sending OTP emails via nodemailer
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTPEmail = sendOTPEmail;
exports.isEmailConfigured = isEmailConfigured;
const nodemailer_1 = __importDefault(require("nodemailer"));
/**
 * Create email transporter based on environment variables
 */
function createTransporter() {
    // Check if email is configured
    const emailHost = process.env.EMAIL_HOST;
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || emailUser || 'noreply@clearways.ai';
    // If no email configuration, return null (emails won't be sent)
    if (!emailHost || !emailUser || !emailPassword) {
        console.warn('[Email Service] Email not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD environment variables.');
        return null;
    }
    const config = {
        host: emailHost,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: emailUser,
            pass: emailPassword,
        },
    };
    // For Gmail, use OAuth2 or App Password
    // For other providers, use SMTP credentials
    return nodemailer_1.default.createTransport(config);
}
/**
 * Send OTP email
 */
async function sendOTPEmail(email, otp) {
    try {
        const transporter = createTransporter();
        if (!transporter) {
            // In development, log OTP instead of sending
            if (process.env.NODE_ENV === 'development') {
                console.log(`[OTP Email] ${email}: ${otp} (expires in 10 minutes)`);
                return true; // Return true so development flow continues
            }
            console.error('[Email Service] Cannot send email: Email service not configured');
            return false;
        }
        const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@clearways.ai';
        const appName = process.env.APP_NAME || 'ClearWays AI';
        const mailOptions = {
            from: `"${appName}" <${emailFrom}>`,
            to: email,
            subject: `Your ${appName} Login Code`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #17A2B8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #17A2B8; text-align: center; padding: 20px; background-color: white; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${appName}</h1>
            </div>
            <div class="content">
              <h2>Your Login Code</h2>
              <p>Use the following code to log in to your account:</p>
              <div class="otp-code">${otp}</div>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
              </div>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${appName}. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `
Your ${appName} Login Code

Use the following code to log in to your account:

${otp}

This code will expire in 10 minutes. Do not share this code with anyone.

If you didn't request this code, please ignore this email.

This is an automated message from ${appName}. Please do not reply to this email.
      `,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Service] OTP email sent to ${email}:`, info.messageId);
        return true;
    }
    catch (error) {
        console.error('[Email Service] Failed to send OTP email:', error);
        return false;
    }
}
/**
 * Verify email configuration
 */
function isEmailConfigured() {
    return !!(process.env.EMAIL_HOST &&
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASSWORD);
}
//# sourceMappingURL=emailService.js.map