import nodemailer from "nodemailer";
import { smtpUser, smtpPass, mailFrom } from "./src/config/env.js";
import { logError } from "./src/utils/logger.js";

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
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
      <h2 style="color:#1e293b">Welcome, ${name}!</h2>
      <p style="color:#475569">Your HRMS account has been created. Here are your login credentials:</p>
      <table style="margin:16px 0;border-collapse:collapse;width:100%">
        <tr>
          <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:40%">Username</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${username}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600">Temporary Password</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace">${password}</td>
        </tr>
      </table>
      <div style="text-align:center;margin:24px 0">
        <a href="${loginLink}"
           style="background:#f97316;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
          Login to HRMS
        </a>
      </div>
      <p style="color:#ef4444;font-size:14px">⚠️ This is a temporary password. You will be asked to set a new password on first login.</p>
      <p style="color:#64748b;font-size:13px">Please keep your credentials secure and do not share them.</p>
    </div>
  `;

  await sendMail({ from: mailFrom, to, subject, html });
}

export async function sendPasswordResetEmail({ to, name, resetLink }) {
  const subject = "HRMS – Set Your Password";
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
      <h2 style="color:#1e293b">Hi ${name},</h2>
      <p style="color:#475569">Click the button below to set your new password. This link expires in <strong>1 hour</strong>.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${resetLink}"
           style="background:#f97316;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
          Set New Password
        </a>
      </div>
      <p style="color:#64748b;font-size:13px">If you did not request this, you can safely ignore this email.</p>
      <p style="color:#94a3b8;font-size:12px;word-break:break-all">Or copy this link: ${resetLink}</p>
    </div>
  `;

  await sendMail({ from: mailFrom, to, subject, html });
}

export async function sendPasswordExpiredEmail({ to, name, resetLink }) {
  const subject = "HRMS – Your Password Has Expired";
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin-bottom:20px;border-radius:4px">
        <p style="color:#92400e;font-weight:600;margin:0">⚠️ Password Expired</p>
      </div>
      <h2 style="color:#1e293b">Hi ${name},</h2>
      <p style="color:#475569">Your password has expired after 40 days for security reasons. You must reset your password to continue accessing the HRMS system.</p>
      <p style="color:#475569">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${resetLink}"
           style="background:#f97316;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
          Reset Password Now
        </a>
      </div>
      <div style="background:#f1f5f9;padding:12px 16px;border-radius:4px;margin:16px 0">
        <p style="color:#334155;font-size:13px;margin:0"><strong>Security Reminder:</strong> Passwords must be changed every 40 days to keep your account secure.</p>
      </div>
      <p style="color:#64748b;font-size:13px">If you have trouble accessing your account, please contact your HR administrator.</p>
      <p style="color:#94a3b8;font-size:12px;word-break:break-all">Or copy this link: ${resetLink}</p>
    </div>
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
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin-bottom:20px;border-radius:4px">
        <p style="color:#92400e;font-weight:600;margin:0">⚠️ Password Expiry Warning</p>
      </div>
      <h2 style="color:#1e293b">Hi ${name},</h2>
      <p style="color:#475569">Your HRMS password will expire in <strong style="color:#f59e0b">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.</p>
      <p style="color:#475569">To maintain account security, please change your password before it expires.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${changePasswordLink}"
           style="background:#f97316;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
          Change Password Now
        </a>
      </div>
      <div style="background:#f1f5f9;padding:12px 16px;border-radius:4px;margin:16px 0">
        <p style="color:#334155;font-size:13px;margin:0"><strong>What happens if my password expires?</strong></p>
        <p style="color:#475569;font-size:13px;margin:8px 0 0 0">If you don't change your password before it expires, you'll need to reset it using the password reset process before you can access the system again.</p>
      </div>
      <p style="color:#64748b;font-size:13px">If you have any questions, please contact your HR administrator.</p>
    </div>
  `;

  await sendMail({ from: mailFrom, to, subject, html });
}
