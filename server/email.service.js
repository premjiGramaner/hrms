import nodemailer from "nodemailer";
import { smtpUser, smtpPass, mailFrom } from "./src/config/env.js";
import { logError } from "./src/utils/logger.js";
import {
  EMAIL_ICONS,
  EMAIL_GRADIENTS,
  EMAIL_COLORS,
  ALERT_BOX_STYLES,
} from "./src/constants/emailIcons.js";

const transporter =
  smtpUser && smtpPass
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

async function sendMail(options) {
  if (!transporter) {
    logError("SMTP not configured - transporter is null");
    throw new Error(
      "SMTP_USER and SMTP_PASS must be configured before sending email.",
    );
  }
  try {
    return await transporter.sendMail(options);
  } catch (err) {
    throw err;
  }
}

export async function sendWelcomeEmail({
  to,
  name,
  username,
  password,
  loginUrl,
}) {
  const subject = "Welcome to HRMS – Your Account Credentials";
  const loginLink = loginUrl || "http://localhost:5173/login";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:20px;background:${EMAIL_COLORS.GRAY_50};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
      <div style="max-width:600px;margin:0 auto;background:${EMAIL_COLORS.WHITE};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        <div style="background:${EMAIL_GRADIENTS.PRIMARY};padding:32px 24px;text-align:center">
          <div style="font-size:48px;margin-bottom:8px">${EMAIL_ICONS.WAVE}</div>
          <h1 style="color:${EMAIL_COLORS.WHITE};margin:0;font-size:28px;font-weight:700">Welcome to HRMS</h1>
        </div>
        
        <div style="padding:32px 24px">
          <h2 style="color:${EMAIL_COLORS.GRAY_900};margin:0 0 16px 0;font-size:20px">Hello ${name},</h2>
          <p style="color:${EMAIL_COLORS.GRAY_600};font-size:15px;line-height:1.6;margin:0 0 24px 0">Your HRMS account has been successfully created. Below are your login credentials to access the system:</p>
          
          <div style="background:${EMAIL_COLORS.GRAY_50};border-radius:8px;padding:20px;margin:24px 0">
            <div style="margin-bottom:16px">
              <div style="color:${EMAIL_COLORS.GRAY_500};font-size:13px;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">${EMAIL_ICONS.USER} Username</div>
              <div style="color:${EMAIL_COLORS.PRIMARY};font-size:16px;font-weight:600">${username}</div>
            </div>
            <div style="border-top:1px solid ${EMAIL_COLORS.GRAY_200};padding-top:16px">
              <div style="color:${EMAIL_COLORS.GRAY_500};font-size:13px;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">${EMAIL_ICONS.KEY} Temporary Password</div>
              <div style="color:${EMAIL_COLORS.PRIMARY};font-size:16px;font-weight:600;font-family:'Courier New',monospace;background:${EMAIL_COLORS.WHITE};padding:12px;border-radius:6px;border:1px solid ${EMAIL_COLORS.GRAY_200}">${password}</div>
            </div>
          </div>

          <div style="text-align:center;margin:32px 0">
            <a href="${loginLink}" style="display:inline-block;background:${EMAIL_GRADIENTS.PRIMARY};color:${EMAIL_COLORS.WHITE};padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(20,184,166,0.3)">
              ${EMAIL_ICONS.ROCKET} Login to HRMS
            </a>
          </div>

          <div style="background:${ALERT_BOX_STYLES.DANGER.background};border-left:4px solid ${ALERT_BOX_STYLES.DANGER.borderColor};padding:16px;border-radius:6px;margin:24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:20px;margin-right:12px">${EMAIL_ICONS.WARNING}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.DANGER.titleColor};font-weight:600;margin-bottom:4px">Important Security Notice</div>
                <div style="color:${ALERT_BOX_STYLES.DANGER.textColor};font-size:14px;line-height:1.5">This is a temporary password. You will be required to create a new secure password upon your first login.</div>
              </div>
            </div>
          </div>

          <div style="background:${ALERT_BOX_STYLES.INFO.background};border-left:4px solid ${ALERT_BOX_STYLES.INFO.borderColor};padding:16px;border-radius:6px;margin:24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:20px;margin-right:12px">${EMAIL_ICONS.LOCK}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.INFO.titleColor};font-weight:600;margin-bottom:4px">Security Best Practices</div>
                <div style="color:${ALERT_BOX_STYLES.INFO.textColor};font-size:14px;line-height:1.5">Keep your credentials secure and never share them with anyone. Use a strong, unique password for your account.</div>
              </div>
            </div>
          </div>
        </div>

        <div style="background:${EMAIL_COLORS.GRAY_50};padding:24px;text-align:center;border-top:1px solid ${EMAIL_COLORS.GRAY_200}">
          <p style="color:${EMAIL_COLORS.GRAY_500};font-size:13px;margin:0">If you need assistance, please contact your HR administrator.</p>
          <p style="color:${EMAIL_COLORS.GRAY_400};font-size:12px;margin:12px 0 0 0">© ${new Date().getFullYear()} HRMS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendMail({ from: mailFrom, to, subject, html });
}

export async function sendPasswordResetEmail({ to, name, resetLink }) {
  const subject = "HRMS – Set Your Password";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:20px;background:${EMAIL_COLORS.GRAY_50};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
      <div style="max-width:600px;margin:0 auto;background:${EMAIL_COLORS.WHITE};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        <div style="background:${EMAIL_GRADIENTS.PRIMARY};padding:32px 24px;text-align:center">
          <div style="font-size:48px;margin-bottom:8px">${EMAIL_ICONS.SECURITY}</div>
          <h1 style="color:${EMAIL_COLORS.WHITE};margin:0;font-size:28px;font-weight:700">Password Reset Request</h1>
        </div>
        
        <div style="padding:32px 24px">
          <h2 style="color:${EMAIL_COLORS.GRAY_900};margin:0 0 16px 0;font-size:20px">Hello ${name},</h2>
          <p style="color:${EMAIL_COLORS.GRAY_600};font-size:15px;line-height:1.6;margin:0 0 24px 0">We received a request to reset your password. Click the button below to set a new password for your HRMS account.</p>
          
          <div style="background:${ALERT_BOX_STYLES.WARNING.background};border-left:4px solid ${ALERT_BOX_STYLES.WARNING.borderColor};padding:16px;border-radius:6px;margin:24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:20px;margin-right:12px">${EMAIL_ICONS.CLOCK}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.WARNING.titleColor};font-weight:600;margin-bottom:4px">Time Sensitive</div>
                <div style="color:${ALERT_BOX_STYLES.WARNING.textColor};font-size:14px;line-height:1.5">This password reset link will expire in <strong>1 hour</strong> for security reasons.</div>
              </div>
            </div>
          </div>

          <div style="text-align:center;margin:32px 0">
            <a href="${resetLink}" style="display:inline-block;background:${EMAIL_GRADIENTS.PRIMARY};color:${EMAIL_COLORS.WHITE};padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(20,184,166,0.3)">
              ${EMAIL_ICONS.KEY} Set New Password
            </a>
          </div>

          <div style="background:${ALERT_BOX_STYLES.SUCCESS.background};border-left:4px solid ${ALERT_BOX_STYLES.SUCCESS.borderColor};padding:16px;border-radius:6px;margin:24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:20px;margin-right:12px">${EMAIL_ICONS.CHECKMARK}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.SUCCESS.titleColor};font-weight:600;margin-bottom:4px">Didn't Request This?</div>
                <div style="color:${ALERT_BOX_STYLES.SUCCESS.textColor};font-size:14px;line-height:1.5">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</div>
              </div>
            </div>
          </div>

          <div style="background:${EMAIL_COLORS.GRAY_50};border-radius:8px;padding:16px;margin:24px 0">
            <div style="color:${EMAIL_COLORS.GRAY_500};font-size:12px;font-weight:600;margin-bottom:8px">${EMAIL_ICONS.LINK} Alternative Link</div>
            <div style="color:${EMAIL_COLORS.GRAY_400};font-size:12px;word-break:break-all;line-height:1.5">${resetLink}</div>
          </div>
        </div>

        <div style="background:${EMAIL_COLORS.GRAY_50};padding:24px;text-align:center;border-top:1px solid ${EMAIL_COLORS.GRAY_200}">
          <p style="color:${EMAIL_COLORS.GRAY_500};font-size:13px;margin:0">If you need assistance, please contact your HR administrator.</p>
          <p style="color:${EMAIL_COLORS.GRAY_400};font-size:12px;margin:12px 0 0 0">© ${new Date().getFullYear()} HRMS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendMail({ from: mailFrom, to, subject, html });
}

export async function sendPasswordExpiredEmail({ to, name, resetLink }) {
  const subject = "HRMS – Your Password Has Expired";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:20px;background:${EMAIL_COLORS.GRAY_50};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
      <div style="max-width:600px;margin:0 auto;background:${EMAIL_COLORS.WHITE};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        <div style="background:${EMAIL_GRADIENTS.DANGER};padding:32px 24px;text-align:center">
          <div style="font-size:48px;margin-bottom:8px">${EMAIL_ICONS.LOCK}</div>
          <h1 style="color:${EMAIL_COLORS.WHITE};margin:0;font-size:28px;font-weight:700">Password Expired</h1>
        </div>
        
        <div style="padding:32px 24px">
          <div style="background:${ALERT_BOX_STYLES.DANGER.background};border-left:4px solid ${ALERT_BOX_STYLES.DANGER.borderColor};padding:16px;border-radius:6px;margin:0 0 24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:24px;margin-right:12px">${EMAIL_ICONS.WARNING}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.DANGER.titleColor};font-weight:600;font-size:16px;margin-bottom:4px">Action Required</div>
                <div style="color:${ALERT_BOX_STYLES.DANGER.textColor};font-size:14px;line-height:1.5">Your password has expired and must be reset immediately.</div>
              </div>
            </div>
          </div>

          <h2 style="color:${EMAIL_COLORS.GRAY_900};margin:0 0 16px 0;font-size:20px">Hello ${name},</h2>
          <p style="color:${EMAIL_COLORS.GRAY_600};font-size:15px;line-height:1.6;margin:0 0 16px 0">Your HRMS password has expired after <strong>40 days</strong> as part of our security policy. You must reset your password to continue accessing the system.</p>
          
          <div style="background:${EMAIL_COLORS.GRAY_50};border-radius:8px;padding:20px;margin:24px 0">
            <div style="text-align:center;margin-bottom:16px">
              <div style="font-size:40px;margin-bottom:8px">${EMAIL_ICONS.SHIELD}</div>
              <div style="color:${EMAIL_COLORS.GRAY_900};font-weight:600;font-size:16px">Security Policy</div>
            </div>
            <div style="color:${EMAIL_COLORS.GRAY_600};font-size:14px;line-height:1.6;text-align:center">
              Passwords must be changed every <strong>40 days</strong> to maintain account security and protect sensitive information.
            </div>
          </div>

          <div style="text-align:center;margin:32px 0">
            <a href="${resetLink}" style="display:inline-block;background:${EMAIL_GRADIENTS.DANGER};color:${EMAIL_COLORS.WHITE};padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(239,68,68,0.3)">
              ${EMAIL_ICONS.SECURITY} Reset Password Now
            </a>
          </div>

          <div style="background:${ALERT_BOX_STYLES.WARNING.background};border-left:4px solid ${ALERT_BOX_STYLES.WARNING.borderColor};padding:16px;border-radius:6px;margin:24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:20px;margin-right:12px">${EMAIL_ICONS.CLOCK}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.WARNING.titleColor};font-weight:600;margin-bottom:4px">Time Sensitive</div>
                <div style="color:${ALERT_BOX_STYLES.WARNING.textColor};font-size:14px;line-height:1.5">This password reset link will expire in <strong>1 hour</strong>. Please reset your password promptly.</div>
              </div>
            </div>
          </div>

          <div style="background:${ALERT_BOX_STYLES.SUCCESS.background};border-left:4px solid ${ALERT_BOX_STYLES.SUCCESS.borderColor};padding:16px;border-radius:6px;margin:24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:20px;margin-right:12px">${EMAIL_ICONS.LIGHTBULB}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.SUCCESS.titleColor};font-weight:600;margin-bottom:4px">Password Tips</div>
                <ul style="color:${ALERT_BOX_STYLES.SUCCESS.textColor};font-size:14px;line-height:1.6;margin:8px 0;padding-left:20px">
                  <li>Use at least 8 characters</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Add numbers and special characters</li>
                  <li>Avoid common words or personal information</li>
                </ul>
              </div>
            </div>
          </div>

          <div style="background:${EMAIL_COLORS.GRAY_50};border-radius:8px;padding:16px;margin:24px 0">
            <div style="color:${EMAIL_COLORS.GRAY_500};font-size:12px;font-weight:600;margin-bottom:8px">${EMAIL_ICONS.LINK} Alternative Link</div>
            <div style="color:${EMAIL_COLORS.GRAY_400};font-size:12px;word-break:break-all;line-height:1.5">${resetLink}</div>
          </div>
        </div>

        <div style="background:${EMAIL_COLORS.GRAY_50};padding:24px;text-align:center;border-top:1px solid ${EMAIL_COLORS.GRAY_200}">
          <p style="color:${EMAIL_COLORS.GRAY_500};font-size:13px;margin:0">If you need assistance, please contact your HR administrator.</p>
          <p style="color:${EMAIL_COLORS.GRAY_400};font-size:12px;margin:12px 0 0 0">© ${new Date().getFullYear()} HRMS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendMail({ from: mailFrom, to, subject, html });
}

export async function sendPasswordExpiryReminderEmail({
  to,
  name,
  daysLeft,
  changePasswordLink,
}) {
  const subject = `HRMS – Password Expiring in ${daysLeft} Day${daysLeft !== 1 ? "s" : ""}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:20px;background:${EMAIL_COLORS.GRAY_50};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
      <div style="max-width:600px;margin:0 auto;background:${EMAIL_COLORS.WHITE};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
        <div style="background:${EMAIL_GRADIENTS.WARNING};padding:32px 24px;text-align:center">
          <div style="font-size:48px;margin-bottom:8px">${EMAIL_ICONS.CLOCK}</div>
          <h1 style="color:${EMAIL_COLORS.WHITE};margin:0;font-size:28px;font-weight:700">Password Expiry Warning</h1>
        </div>
        
        <div style="padding:32px 24px">
          <div style="background:${ALERT_BOX_STYLES.WARNING.background};border-left:4px solid ${ALERT_BOX_STYLES.WARNING.borderColor};padding:16px;border-radius:6px;margin:0 0 24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:24px;margin-right:12px">${EMAIL_ICONS.WARNING}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.WARNING.titleColor};font-weight:600;font-size:16px;margin-bottom:4px">Action Recommended</div>
                <div style="color:${ALERT_BOX_STYLES.WARNING.textColor};font-size:14px;line-height:1.5">Your password will expire soon. Please change it at your earliest convenience.</div>
              </div>
            </div>
          </div>

          <h2 style="color:${EMAIL_COLORS.GRAY_900};margin:0 0 16px 0;font-size:20px">Hello ${name},</h2>
          <p style="color:${EMAIL_COLORS.GRAY_600};font-size:15px;line-height:1.6;margin:0 0 16px 0">This is a friendly reminder that your HRMS password will expire in:</p>
          
          <div style="text-align:center;margin:24px 0">
            <div style="display:inline-block;background:${EMAIL_GRADIENTS.WARNING};padding:24px 40px;border-radius:12px;box-shadow:0 4px 12px rgba(245,158,11,0.3)">
              <div style="color:${EMAIL_COLORS.WHITE};font-size:48px;font-weight:700;line-height:1">${daysLeft}</div>
              <div style="color:#fffbeb;font-size:18px;font-weight:600;margin-top:8px">Day${daysLeft !== 1 ? "s" : ""}</div>
            </div>
          </div>

          <p style="color:${EMAIL_COLORS.GRAY_600};font-size:15px;line-height:1.6;margin:0 0 24px 0">To maintain account security and avoid being locked out, please change your password before it expires.</p>

          <div style="text-align:center;margin:32px 0">
            <a href="${changePasswordLink}" style="display:inline-block;background:${EMAIL_GRADIENTS.PRIMARY};color:${EMAIL_COLORS.WHITE};padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(20,184,166,0.3)">
              ${EMAIL_ICONS.KEY} Change Password Now
            </a>
          </div>

          <div style="background:${ALERT_BOX_STYLES.DANGER.background};border-left:4px solid ${ALERT_BOX_STYLES.DANGER.borderColor};padding:16px;border-radius:6px;margin:24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:20px;margin-right:12px">${EMAIL_ICONS.ALERT}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.DANGER.titleColor};font-weight:600;margin-bottom:4px">What Happens if My Password Expires?</div>
                <div style="color:${ALERT_BOX_STYLES.DANGER.textColor};font-size:14px;line-height:1.5">If your password expires before you change it, you will be locked out of your account and will need to complete the password reset process to regain access.</div>
              </div>
            </div>
          </div>

          <div style="background:${ALERT_BOX_STYLES.SUCCESS.background};border-left:4px solid ${ALERT_BOX_STYLES.SUCCESS.borderColor};padding:16px;border-radius:6px;margin:24px 0">
            <div style="display:flex;align-items:start">
              <div style="font-size:20px;margin-right:12px">${EMAIL_ICONS.LIGHTBULB}</div>
              <div>
                <div style="color:${ALERT_BOX_STYLES.SUCCESS.titleColor};font-weight:600;margin-bottom:4px">Creating a Strong Password</div>
                <div style="color:${ALERT_BOX_STYLES.SUCCESS.textColor};font-size:14px;line-height:1.5;margin-bottom:8px">Follow these guidelines for a secure password:</div>
                <ul style="color:${ALERT_BOX_STYLES.SUCCESS.textColor};font-size:14px;line-height:1.6;margin:0;padding-left:20px">
                  <li>Minimum 8 characters long</li>
                  <li>Mix of uppercase and lowercase letters</li>
                  <li>Include numbers and special characters</li>
                  <li>Avoid dictionary words and personal info</li>
                  <li>Don't reuse old passwords</li>
                </ul>
              </div>
            </div>
          </div>

          <div style="background:${EMAIL_COLORS.GRAY_50};border-radius:8px;padding:20px;margin:24px 0;text-align:center">
            <div style="font-size:32px;margin-bottom:12px">${EMAIL_ICONS.SHIELD}</div>
            <div style="color:${EMAIL_COLORS.GRAY_900};font-weight:600;font-size:15px;margin-bottom:8px">Security Policy Reminder</div>
            <div style="color:${EMAIL_COLORS.GRAY_500};font-size:14px;line-height:1.6">Passwords must be changed every <strong style="color:${EMAIL_COLORS.PRIMARY}">40 days</strong> to protect your account and maintain system security.</div>
          </div>
        </div>

        <div style="background:${EMAIL_COLORS.GRAY_50};padding:24px;text-align:center;border-top:1px solid ${EMAIL_COLORS.GRAY_200}">
          <p style="color:${EMAIL_COLORS.GRAY_500};font-size:13px;margin:0">If you need assistance, please contact your HR administrator.</p>
          <p style="color:${EMAIL_COLORS.GRAY_400};font-size:12px;margin:12px 0 0 0">© ${new Date().getFullYear()} HRMS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendMail({ from: mailFrom, to, subject, html });
}
