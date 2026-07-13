import nodemailer from "nodemailer";
import { smtpUser, smtpPass, mailFrom } from "../config/env.js";
import { logEmail, logError } from "../utils/logger.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendWelcomeEmail({ to, name, username, password }) {
  const subject = "Welcome to HRMS – Your Account Credentials";
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
      <p style="color:#ef4444;font-size:14px">⚠️ This is a temporary password. You will be asked to set a new password on first login.</p>
      <p style="color:#64748b;font-size:13px">Please keep your credentials secure and do not share them.</p>
    </div>
  `;

  try {
    logEmail("Sending welcome email", to, { username });
    await transporter.sendMail({ from: mailFrom, to, subject, html });
    logEmail("Welcome email sent successfully", to);
  } catch (error) {
    logError("Failed to send welcome email", error, { recipient: to });
    throw error;
  }
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

  try {
    logEmail("Sending password reset email", to, { name });
    await transporter.sendMail({ from: mailFrom, to, subject, html });
    logEmail("Password reset email sent successfully", to);
  } catch (error) {
    logError("Failed to send password reset email", error, { recipient: to });
    throw error;
  }
}
