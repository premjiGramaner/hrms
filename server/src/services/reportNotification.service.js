import nodemailer from "nodemailer";
import pool from "../config/db.js";
import ReportModel from "../models/report.model.js";
import { smtpUser, smtpPass, mailFrom } from "../config/env.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

/**
 * Send Birthday Alert Email to HR Admin Team
 */
async function sendBirthdayAlertEmail(upcomingBirthdaysData, recipientEmails) {
  if (!upcomingBirthdaysData || upcomingBirthdaysData.length === 0) {
    return { success: true, message: "No birthdays to notify" };
  }

  const birthdayListHTML = upcomingBirthdaysData
    .map(
      (employee) => `
      <tr>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.employee_id || "N/A"}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.employee_name || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.formatted_birthday || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.job_title || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.location || ""}</td>
      </tr>
    `,
    )
    .join("");

  const subject = `🎂 Upcoming Employee Birthdays Alert`;
  const html = `
    <div style="font-family:sans-serif;max-width:700px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
      <h2 style="color:#1e293b">🎉 Upcoming Employee Birthdays</h2>
      <p style="color:#475569">The following employees have birthdays coming up soon:</p>
      
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <thead>
          <tr style="background:#1B2A6B;color:#fff">
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Emp ID</th>
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Name</th>
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Birthday</th>
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Job Title</th>
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Location</th>
          </tr>
        </thead>
        <tbody>
          ${birthdayListHTML}
        </tbody>
      </table>
      
      <p style="color:#64748b;font-size:13px;margin-top:20px">This is an automated reminder from the HRMS Reports & Analytics system.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: mailFrom,
      to: recipientEmails.join(", "),
      subject,
      html,
    });
    return { success: true, message: "Birthday alert email sent successfully" };
  } catch (err) {
    console.error("Birthday email send error:", err);
    return { success: false, message: err.message };
  }
}

/**
 * Send Work Anniversary Alert Email to HR Admin Team
 */
async function sendWorkAnniversaryAlertEmail(
  upcomingAnniversariesData,
  recipientEmails,
) {
  if (!upcomingAnniversariesData || upcomingAnniversariesData.length === 0) {
    return { success: true, message: "No work anniversaries to notify" };
  }

  const anniversaryListHTML = upcomingAnniversariesData
    .map(
      (employee) => `
      <tr>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.employee_id || "N/A"}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.employee_name || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.formatted_anniversary || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;text-align:center;font-weight:600;color:#16A085">${employee.years_completing || 0} Year${employee.years_completing !== 1 ? "s" : ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.job_title || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.location || ""}</td>
      </tr>
    `,
    )
    .join("");

  const subject = `🎊 Upcoming Employee Work Anniversaries Alert`;
  const html = `
    <div style="font-family:sans-serif;max-width:750px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
      <h2 style="color:#1e293b">🏆 Upcoming Employee Work Anniversaries</h2>
      <p style="color:#475569">The following employees are celebrating work anniversaries soon:</p>
      
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <thead>
          <tr style="background:#1B2A6B;color:#fff">
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Emp ID</th>
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Name</th>
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Anniversary</th>
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:center">Years</th>
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Job Title</th>
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">Location</th>
          </tr>
        </thead>
        <tbody>
          ${anniversaryListHTML}
        </tbody>
      </table>
      
      <p style="color:#64748b;font-size:13px;margin-top:20px">This is an automated reminder from the HRMS Reports & Analytics system.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: mailFrom,
      to: recipientEmails.join(", "),
      subject,
      html,
    });
    return {
      success: true,
      message: "Work anniversary alert email sent successfully",
    };
  } catch (err) {
    console.error("Work anniversary email send error:", err);
    return { success: false, message: err.message };
  }
}
async function processBirthdayNotifications() {
  try {
    const notificationConfig =
      await ReportModel.getNotificationConfig("birthday");

    if (!notificationConfig || !notificationConfig.is_active) {
      console.log("Birthday notifications are disabled");
      return { success: false, message: "Birthday notifications disabled" };
    }

    const daysBefore = notificationConfig.days_before || 2;
    const upcomingBirthdays =
      await ReportModel.getUpcomingBirthdays(daysBefore);

    if (upcomingBirthdays.length === 0) {
      return { success: true, message: "No upcoming birthdays" };
    }

    const recipientUserIds = notificationConfig.recipient_user_ids || [];
    let recipientEmails = [];

    if (recipientUserIds.length > 0) {
      const { rows: recipients } = await pool.query(
        `SELECT email FROM tbl_appusers WHERE id = ANY($1) AND is_deleted = FALSE AND is_active = TRUE`,
        [recipientUserIds],
      );
      recipientEmails = recipients.map((r) => r.email).filter(Boolean);
    }

    if (notificationConfig.external_emails) {
      const externalEmails = notificationConfig.external_emails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      recipientEmails = [...recipientEmails, ...externalEmails];
    }

    if (recipientEmails.length === 0) {
      return { success: false, message: "No recipient emails configured" };
    }

    const emailResult = await sendBirthdayAlertEmail(
      upcomingBirthdays,
      recipientEmails,
    );

    for (const employee of upcomingBirthdays) {
      const alreadySent = await ReportModel.checkNotificationAlreadySent(
        "birthday",
        employee.id,
        employee.birthday_date,
      );
      if (!alreadySent) {
        await ReportModel.logNotificationSent(
          "birthday",
          employee.id,
          employee.birthday_date,
          recipientUserIds,
          emailResult.success ? "sent" : "failed",
          emailResult.success ? null : emailResult.message,
        );
      }
    }

    return emailResult;
  } catch (err) {
    console.error("Process birthday notifications error:", err);
    return { success: false, message: err.message };
  }
}

async function processWorkAnniversaryNotifications() {
  try {
    const notificationConfig =
      await ReportModel.getNotificationConfig("work_anniversary");

    if (!notificationConfig || !notificationConfig.is_active) {
      return {
        success: false,
        message: "Work anniversary notifications disabled",
      };
    }

    const daysBefore = notificationConfig.days_before || 2;
    const upcomingAnniversaries =
      await ReportModel.getUpcomingWorkAnniversaries(daysBefore);

    if (upcomingAnniversaries.length === 0) {
      return { success: true, message: "No upcoming work anniversaries" };
    }

    const recipientUserIds = notificationConfig.recipient_user_ids || [];
    let recipientEmails = [];

    if (recipientUserIds.length > 0) {
      const { rows: recipients } = await pool.query(
        `SELECT email FROM tbl_appusers WHERE id = ANY($1) AND is_deleted = FALSE AND is_active = TRUE`,
        [recipientUserIds],
      );
      recipientEmails = recipients.map((r) => r.email).filter(Boolean);
    }

    if (notificationConfig.external_emails) {
      const externalEmails = notificationConfig.external_emails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      recipientEmails = [...recipientEmails, ...externalEmails];
    }

    if (recipientEmails.length === 0) {
      return { success: false, message: "No recipient emails configured" };
    }

    const emailResult = await sendWorkAnniversaryAlertEmail(
      upcomingAnniversaries,
      recipientEmails,
    );

    for (const employee of upcomingAnniversaries) {
      const alreadySent = await ReportModel.checkNotificationAlreadySent(
        "work_anniversary",
        employee.id,
        employee.date_of_joining,
      );
      if (!alreadySent) {
        await ReportModel.logNotificationSent(
          "work_anniversary",
          employee.id,
          employee.date_of_joining,
          recipientUserIds,
          emailResult.success ? "sent" : "failed",
          emailResult.success ? null : emailResult.message,
        );
      }
    }

    return emailResult;
  } catch (err) {
    console.error("Process work anniversary notifications error:", err);
    return { success: false, message: err.message };
  }
}

export {
  sendBirthdayAlertEmail,
  sendWorkAnniversaryAlertEmail,
  processBirthdayNotifications,
  processWorkAnniversaryNotifications,
};
