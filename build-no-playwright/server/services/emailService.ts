import { MailService } from '@sendgrid/mail';
import { User } from '@shared/schema';
import * as jwt from 'jsonwebtoken';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@uaebusinesssetup.com';

/**
 * Generate a verification token for email verification
 */
export function generateVerificationToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email, type: 'email_verification' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Generate a password reset token
 */
export function generatePasswordResetToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email, type: 'password_reset' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Verify a token (either verification or password reset)
 */
export function verifyToken(token: string): { userId: number; email: string; type: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string; type: string };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Send email verification
 */
export async function sendVerificationEmail(user: User): Promise<boolean> {
  try {
    const token = generateVerificationToken(user.id, user.email);
    const verificationUrl = `${BASE_URL}/verify-email?token=${token}`;
    
    const msg = {
      to: user.email,
      from: FROM_EMAIL,
      subject: 'Verify Your UAE Business Setup Account',
      text: `Welcome to UAE Business Setup! Please verify your email by clicking this link: ${verificationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Welcome to UAE Business Setup!</h2>
          <p>Thank you for registering. Please verify your email address to complete your registration.</p>
          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If you did not create an account, you can safely ignore this email.</p>
          <p>This verification link will expire in 24 hours.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #7f8c8d; font-size: 12px;">
            UAE Business Setup - Helping entrepreneurs establish businesses in the UAE
          </p>
        </div>
      `
    };

    await mailService.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(user: User): Promise<boolean> {
  try {
    const token = generatePasswordResetToken(user.id, user.email);
    const resetUrl = `${BASE_URL}/reset-password?token=${token}`;
    
    const msg = {
      to: user.email,
      from: FROM_EMAIL,
      subject: 'Reset Your UAE Business Setup Password',
      text: `You requested to reset your password. Please click this link to reset it: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Reset Your Password</h2>
          <p>You've requested to reset your password for your UAE Business Setup account.</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
          <p>This password reset link will expire in 1 hour.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #7f8c8d; font-size: 12px;">
            UAE Business Setup - Helping entrepreneurs establish businesses in the UAE
          </p>
        </div>
      `
    };

    await mailService.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Send welcome email after email verification
 */
export async function sendWelcomeEmail(user: User): Promise<boolean> {
  try {
    const msg = {
      to: user.email,
      from: FROM_EMAIL,
      subject: 'Welcome to UAE Business Setup!',
      text: `Thank you for verifying your email address. Your account is now fully activated.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Welcome to UAE Business Setup!</h2>
          <p>Thank you for verifying your email address. Your account is now fully activated.</p>
          <p>You can now access all the features of our platform to help you establish your business in the UAE:</p>
          <ul style="line-height: 1.6;">
            <li>Explore free zones and their benefits</li>
            <li>Compare business setup options</li>
            <li>Access document templates</li>
            <li>Get personalized recommendations</li>
          </ul>
          <div style="margin: 30px 0;">
            <a href="${BASE_URL}/dashboard" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          <hr style="border: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #7f8c8d; font-size: 12px;">
            UAE Business Setup - Helping entrepreneurs establish businesses in the UAE
          </p>
        </div>
      `
    };

    await mailService.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}