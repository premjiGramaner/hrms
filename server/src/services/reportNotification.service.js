import nodemailer from "nodemailer";
import pool from "../config/db.js";
import ReportModel from "../models/report.model.js";
import { smtpUser, smtpPass, mailFrom } from "../config/env.js";
import {
  logError,
  logNotification,
  logEmail,
} from "../utils/logger.js";
import {
  notificationMessages,
  successMessage,
} from "../utils/responseMessages.js";
import { ADMIN_ROLES } from "../constants/roles.js";

const ADMIN_ROLES_SQL = ADMIN_ROLES.map((role) => `'${role}'`).join(", ");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

// ─── Private Helpers ─────────────────────────────────────────────────────────

async function getGlobalAdminRecipients() {
  const { rows } = await pool.query(
    `SELECT id, email FROM tbl_appusers
     WHERE (role IN (${ADMIN_ROLES_SQL})) 
     AND is_deleted = FALSE 
     AND is_active = TRUE 
     AND email IS NOT NULL`,
  );
  return {
    recipientEmails: rows.map((admin) => admin.email).filter(Boolean),
    recipientUserIds: rows.length > 0
      ? rows.map((admin) => admin.id || 0).filter((id) => id > 0)
      : [],
  };
}

function parseExternalEmails(externalEmailsString) {
  if (!externalEmailsString) return [];
  return externalEmailsString
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function appendExternalRecipients(recipientEmails, notificationConfig) {
  const externalEmails = parseExternalEmails(notificationConfig.external_emails);
  return [
    ...new Set(
      [...recipientEmails, ...externalEmails].map((email) =>
        String(email).trim().toLowerCase(),
      ),
    ),
  ].filter(Boolean);
}

function isNotificationEnabled(notificationConfig) {
  return Boolean(notificationConfig?.is_active);
}

async function getUnsentEvents(notificationType, employees, force = false) {
  if (force) return employees;

  const unsentEvents = [];
  for (const employee of employees) {
    if (!employee.notification_event_date) continue;
    const alreadySent = await ReportModel.checkNotificationAlreadySent(
      notificationType,
      employee.id,
      employee.notification_event_date,
    );
    if (!alreadySent) unsentEvents.push(employee);
  }
  return unsentEvents;
}

// ─── Email Senders ───────────────────────────────────────────────────────────

async function sendBirthdayAlertEmail(upcomingBirthdaysData, recipientEmails) {
  if (!upcomingBirthdaysData || upcomingBirthdaysData.length === 0) {
    return notificationMessages.noItems("birthdays");
  }

  const birthdayListHTML = upcomingBirthdaysData
    .map(
      (employee) => `
      <tr>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.employee_id || "N/A"}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.employee_name || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.formatted_birthday || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;font-weight:600;color:${employee.when_is_birthday === "Today" ? "#DC2626" : "#16A085"}">${employee.when_is_birthday || ""}</td>
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
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">When</th>
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

  logEmail("Sending birthday notification", recipientEmails.join(", "), {
    count: upcomingBirthdaysData.length,
  });

  try {
    const delivery = await transporter.sendMail({
      from: mailFrom,
      to: recipientEmails.join(", "),
      subject,
      html,
    });
    const acceptedCount = Array.isArray(delivery.accepted)
      ? delivery.accepted.length
      : 0;
    if (acceptedCount === 0) {
      throw new Error("The mail server did not accept any recipients");
    }
    logEmail(
      "Birthday notification sent successfully",
      recipientEmails.join(", "),
      {
        recipientCount: acceptedCount,
      },
    );
    return notificationMessages.emailSent("Birthday", acceptedCount);
  } catch (err) {
    logError("Birthday notification email send failed", err, {
      recipients: recipientEmails.join(", "),
    });
    return notificationMessages.sendFailed(err);
  }
}

async function sendWorkAnniversaryAlertEmail(
  upcomingAnniversariesData,
  recipientEmails,
) {
  if (!upcomingAnniversariesData || upcomingAnniversariesData.length === 0) {
    return notificationMessages.noItems("work anniversaries");
  }

  const anniversaryListHTML = upcomingAnniversariesData
    .map(
      (employee) => `
      <tr>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.employee_id || "N/A"}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.employee_name || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${employee.formatted_anniversary || ""}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;font-weight:600;color:${employee.when_is_anniversary === "Today" ? "#DC2626" : "#16A085"}">${employee.when_is_anniversary || ""}</td>
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
            <th style="padding:10px;border:1px solid #1B2A6B;text-align:left">When</th>
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

  logEmail(
    "Sending work anniversary notification",
    recipientEmails.join(", "),
    {
      count: upcomingAnniversariesData.length,
    },
  );

  try {
    const delivery = await transporter.sendMail({
      from: mailFrom,
      to: recipientEmails.join(", "),
      subject,
      html,
    });
    const acceptedCount = Array.isArray(delivery.accepted)
      ? delivery.accepted.length
      : 0;
    if (acceptedCount === 0) {
      throw new Error("The mail server did not accept any recipients");
    }
    logEmail(
      "Work anniversary notification sent successfully",
      recipientEmails.join(", "),
      {
        recipientCount: acceptedCount,
      },
    );
    return notificationMessages.emailSent(
      "Work anniversary",
      acceptedCount,
    );
  } catch (err) {
    logError("Work anniversary notification email send failed", err, {
      recipients: recipientEmails.join(", "),
    });
    return notificationMessages.sendFailed(err);
  }
}

// ─── Notification Processors ─────────────────────────────────────────────────

async function processBirthdayNotifications({ force = false } = {}) {
  try {
    logNotification("Starting birthday notifications processing");

    const notificationConfig =
      await ReportModel.getNotificationConfig("birthday");

    if (!isNotificationEnabled(notificationConfig)) {
      logNotification("Birthday notifications are disabled");
      return notificationMessages.disabled("Birthday");
    }

    const daysBefore = Math.min(
      30,
      Math.max(0, Number(notificationConfig.days_before) || 0),
    );
    logNotification("Checking for upcoming birthdays", {
      daysBefore,
      range: `TODAY to ${daysBefore} day(s) ahead`,
    });

    const upcomingBirthdays =
      await ReportModel.getUpcomingBirthdays(daysBefore);
    const pendingBirthdays = await getUnsentEvents(
      "birthday",
      upcomingBirthdays,
      force,
    );

    logNotification("Found upcoming birthdays", {
      count: upcomingBirthdays.length,
      pendingCount: pendingBirthdays.length,
    });

    if (pendingBirthdays.length === 0) {
      return successMessage(
        upcomingBirthdays.length === 0
          ? `No birthdays found from today to ${daysBefore} day(s) ahead`
          : "Birthday notifications have already been sent for all upcoming events",
      );
    }

    const { recipientEmails: adminEmails, recipientUserIds } =
      await getGlobalAdminRecipients();
    logNotification("Retrieved global admin emails", {
      adminCount: adminEmails.length,
      emails: adminEmails.join(", "),
    });

    const recipientEmails = appendExternalRecipients(
      adminEmails,
      notificationConfig,
    );

    if (recipientEmails.length === 0) {
      logNotification("No recipient emails configured");
      return notificationMessages.noRecipients();
    }

    const emailResult = await sendBirthdayAlertEmail(
      pendingBirthdays,
      recipientEmails,
    );

    for (const employee of pendingBirthdays) {
      await ReportModel.logNotificationSent(
        "birthday",
        employee.id,
        employee.notification_event_date,
        recipientUserIds,
        emailResult.success ? "sent" : "failed",
        emailResult.success ? null : emailResult.message,
      );
    }

    return emailResult;
  } catch (err) {
    logError("Birthday notifications processing failed", err);
    return notificationMessages.processingFailed("Birthday", err);
  }
}

async function processWorkAnniversaryNotifications({ force = false } = {}) {
  try {
    const notificationConfig =
      await ReportModel.getNotificationConfig("work_anniversary");

    if (!isNotificationEnabled(notificationConfig)) {
      logNotification("Work anniversary notifications are disabled");
      return notificationMessages.disabled("Work anniversary");
    }

    const daysBefore = Math.min(
      30,
      Math.max(0, Number(notificationConfig.days_before) || 0),
    );
    logNotification("Checking for upcoming work anniversaries", {
      daysBefore,
      range: `TODAY to ${daysBefore} day(s) ahead`,
    });

    const upcomingAnniversaries =
      await ReportModel.getUpcomingWorkAnniversaries(daysBefore);
    const pendingAnniversaries = await getUnsentEvents(
      "work_anniversary",
      upcomingAnniversaries,
      force,
    );

    logNotification("Found upcoming work anniversaries", {
      count: upcomingAnniversaries.length,
      pendingCount: pendingAnniversaries.length,
    });

    if (pendingAnniversaries.length === 0) {
      return successMessage(
        upcomingAnniversaries.length === 0
          ? `No work anniversaries found from today to ${daysBefore} day(s) ahead`
          : "Work anniversary notifications have already been sent for all upcoming events",
      );
    }

    const { recipientEmails: adminEmails, recipientUserIds } =
      await getGlobalAdminRecipients();

    let recipientEmails = appendExternalRecipients(adminEmails, notificationConfig);

    if (recipientEmails.length === 0) {
      logNotification("No recipient emails configured for work anniversaries");
      return notificationMessages.noRecipients();
    }

    const emailResult = await sendWorkAnniversaryAlertEmail(
      pendingAnniversaries,
      recipientEmails,
    );

    for (const employee of pendingAnniversaries) {
      await ReportModel.logNotificationSent(
        "work_anniversary",
        employee.id,
        employee.notification_event_date,
        recipientUserIds,
        emailResult.success ? "sent" : "failed",
        emailResult.success ? null : emailResult.message,
      );
    }

    return emailResult;
  } catch (err) {
    logError("Work anniversary notifications processing failed", err);
    return notificationMessages.processingFailed("Work anniversary", err);
  }
}

export {
  sendBirthdayAlertEmail,
  sendWorkAnniversaryAlertEmail,
  processBirthdayNotifications,
  processWorkAnniversaryNotifications,
};
