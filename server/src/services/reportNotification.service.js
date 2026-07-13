import nodemailer from "nodemailer";
import pool from "../config/db.js";
import ReportModel from "../models/report.model.js";
import { smtpUser, smtpPass, mailFrom } from "../config/env.js";
import {
  logInfo,
  logError,
  logNotification,
  logEmail,
} from "../utils/logger.js";
import {
  notificationMessages,
  successMessage,
} from "../utils/responseMessages.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

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
    await transporter.sendMail({
      from: mailFrom,
      to: recipientEmails.join(", "),
      subject,
      html,
    });
    logEmail(
      "Birthday notification sent successfully",
      recipientEmails.join(", "),
      {
        recipientCount: recipientEmails.length,
      },
    );
    return notificationMessages.emailSent("Birthday", recipientEmails.length);
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
    await transporter.sendMail({
      from: mailFrom,
      to: recipientEmails.join(", "),
      subject,
      html,
    });
    logEmail(
      "Work anniversary notification sent successfully",
      recipientEmails.join(", "),
      {
        recipientCount: recipientEmails.length,
      },
    );
    return notificationMessages.emailSent(
      "Work anniversary",
      recipientEmails.length,
    );
  } catch (err) {
    logError("Work anniversary notification email send failed", err, {
      recipients: recipientEmails.join(", "),
    });
    return notificationMessages.sendFailed(err);
  }
}
async function processBirthdayNotifications() {
  try {
    logNotification("Starting birthday notifications processing");

    const notificationConfig =
      await ReportModel.getNotificationConfig("birthday");

    if (!notificationConfig || !notificationConfig.is_active) {
      logNotification("Birthday notifications are disabled");
      return notificationMessages.disabled("Birthday");
    }

    const daysBefore = notificationConfig.days_before || 0;
    logNotification("Checking for upcoming birthdays", {
      daysBefore,
      range: `TODAY to ${daysBefore} day(s) ahead`,
    });

    const upcomingBirthdays =
      await ReportModel.getUpcomingBirthdays(daysBefore);

    logNotification("Found upcoming birthdays", {
      count: upcomingBirthdays.length,
    });

    if (upcomingBirthdays.length === 0) {
      return successMessage(
        `No birthdays found from today to ${daysBefore} day(s) ahead`,
      );
    }

    const { rows: globalAdmins } = await pool.query(
      `SELECT email FROM tbl_appusers 
       WHERE (role = 'hradmin' OR role = 'empmanager') 
       AND is_deleted = FALSE 
       AND is_active = TRUE 
       AND email IS NOT NULL`,
    );
    let recipientEmails = globalAdmins
      .map((admin) => admin.email)
      .filter(Boolean);
    logNotification("Retrieved global admin emails", {
      adminCount: recipientEmails.length,
      emails: recipientEmails.join(", "),
    });

    const recipientUserIds =
      recipientEmails.length > 0
        ? globalAdmins.map((admin) => admin.id || 0).filter((id) => id > 0)
        : [];

    if (notificationConfig.external_emails) {
      const externalEmails = notificationConfig.external_emails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      recipientEmails = [...recipientEmails, ...externalEmails];
      logNotification("Added external emails", {
        externalCount: externalEmails.length,
      });
    }

    if (recipientEmails.length === 0) {
      logNotification("No recipient emails configured");
      return notificationMessages.noRecipients();
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
    logError("Birthday notifications processing failed", err);
    return notificationMessages.processingFailed("Birthday", err);
  }
}

async function processWorkAnniversaryNotifications() {
  try {
    const notificationConfig =
      await ReportModel.getNotificationConfig("work_anniversary");

    if (!notificationConfig || !notificationConfig.is_active) {
      logNotification("Work anniversary notifications are disabled");
      return notificationMessages.disabled("Work anniversary");
    }

    const daysBefore = notificationConfig.days_before || 0;
    logNotification("Checking for upcoming work anniversaries", {
      daysBefore,
      range: `TODAY to ${daysBefore} day(s) ahead`,
    });

    const upcomingAnniversaries =
      await ReportModel.getUpcomingWorkAnniversaries(daysBefore);

    logNotification("Found upcoming work anniversaries", {
      count: upcomingAnniversaries.length,
    });

    if (upcomingAnniversaries.length === 0) {
      return successMessage(
        `No work anniversaries found from today to ${daysBefore} day(s) ahead`,
      );
    }

    const { rows: globalAdmins } = await pool.query(
      `SELECT email FROM tbl_appusers 
       WHERE (role = 'hradmin' OR role = 'empmanager') 
       AND is_deleted = FALSE 
       AND is_active = TRUE 
       AND email IS NOT NULL`,
    );
    let recipientEmails = globalAdmins
      .map((admin) => admin.email)
      .filter(Boolean);

    const recipientUserIds =
      recipientEmails.length > 0
        ? globalAdmins.map((admin) => admin.id || 0).filter((id) => id > 0)
        : [];

    if (notificationConfig.external_emails) {
      const externalEmails = notificationConfig.external_emails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);
      recipientEmails = [...recipientEmails, ...externalEmails];
    }

    if (recipientEmails.length === 0) {
      logNotification("No recipient emails configured for work anniversaries");
      return notificationMessages.noRecipients();
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
    logError("Work anniversary notifications processing failed", err);
    return notificationMessages.processingFailed("Work anniversary", err);
  }
}

async function checkAndSendImmediateNotifications(employeeId) {
  try {
    logNotification("Checking immediate notifications for new employee", {
      employeeId,
    });

    const birthdayConfig = await ReportModel.getNotificationConfig("birthday");
    if (birthdayConfig && birthdayConfig.is_active) {
      const daysBefore = birthdayConfig.days_before || 0;

      const { rows: birthdayCheck } = await pool.query(
        `SELECT 
          u.id,
          u.employee_id,
          u.email,
          COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.last_name)) AS employee_name,
          u.real_dob::text AS birthday_date,
          TO_CHAR(u.real_dob, 'Month DD') AS formatted_birthday,
          CASE 
            WHEN TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') THEN 'Today'
            WHEN TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'MM-DD') THEN 'Tomorrow'
            WHEN TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'MM-DD') THEN 'In 2 days'
            ELSE 'Upcoming'
          END AS when_is_birthday,
          u.job_title,
          u.sub_unit,
          u.location
        FROM tbl_appusers u
        WHERE u.id = $1
          AND u.is_deleted = FALSE 
          AND u.is_active = TRUE 
          AND u.real_dob IS NOT NULL
          AND (${Array.from(
            { length: daysBefore + 1 },
            (_, i) =>
              `TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '${i} days', 'MM-DD')`,
          ).join(" OR ")})`,
        [employeeId],
      );

      if (birthdayCheck.length > 0) {
        logNotification("Employee birthday within notification range", {
          employeeId,
          daysBefore,
        });

        // Get global admins
        const { rows: globalAdmins } = await pool.query(
          `SELECT email FROM tbl_appusers 
           WHERE (role = 'hradmin' OR role = 'empmanager') 
           AND is_deleted = FALSE 
           AND is_active = TRUE 
           AND email IS NOT NULL`,
        );
        let recipientEmails = globalAdmins
          .map((admin) => admin.email)
          .filter(Boolean);

        if (birthdayConfig.external_emails) {
          const externalEmails = birthdayConfig.external_emails
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean);
          recipientEmails = [...recipientEmails, ...externalEmails];
        }

        if (recipientEmails.length > 0) {
          await sendBirthdayAlertEmail(birthdayCheck, recipientEmails);
          logNotification("Immediate birthday notification sent", {
            employeeId,
          });
        }
      } else {
        logInfo(`Employee birthday not within ${daysBefore} days range`, {
          employeeId,
        });
      }
    }

    const anniversaryConfig =
      await ReportModel.getNotificationConfig("work_anniversary");
    if (anniversaryConfig && anniversaryConfig.is_active) {
      const daysBefore = anniversaryConfig.days_before || 0;

      const { rows: anniversaryCheck } = await pool.query(
        `SELECT 
          u.id,
          u.employee_id,
          u.email,
          COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.last_name)) AS employee_name,
          u.joined_date::text AS date_of_joining,
          TO_CHAR(u.joined_date, 'Month DD') AS formatted_anniversary,
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.joined_date))::int AS years_completing,
          CASE 
            WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') THEN 'Today'
            WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'MM-DD') THEN 'Tomorrow'
            WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'MM-DD') THEN 'In 2 days'
            ELSE 'Upcoming'
          END AS when_is_anniversary,
          u.job_title,
          u.sub_unit,
          u.location
        FROM tbl_appusers u
        WHERE u.id = $1
          AND u.is_deleted = FALSE 
          AND u.is_active = TRUE 
          AND u.joined_date IS NOT NULL
          AND (${Array.from(
            { length: daysBefore + 1 },
            (_, i) =>
              `TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '${i} days', 'MM-DD')`,
          ).join(" OR ")})
          AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.joined_date)) >= 1`,
        [employeeId],
      );

      if (anniversaryCheck.length > 0) {
        const { rows: globalAdmins } = await pool.query(
          `SELECT email FROM tbl_appusers 
           WHERE (role = 'hradmin' OR role = 'empmanager') 
           AND is_deleted = FALSE 
           AND is_active = TRUE 
           AND email IS NOT NULL`,
        );
        let recipientEmails = globalAdmins
          .map((admin) => admin.email)
          .filter(Boolean);

        if (anniversaryConfig.external_emails) {
          const externalEmails = anniversaryConfig.external_emails
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean);
          recipientEmails = [...recipientEmails, ...externalEmails];
        }

        if (recipientEmails.length > 0) {
          await sendWorkAnniversaryAlertEmail(
            anniversaryCheck,
            recipientEmails,
          );
          logNotification("Immediate work anniversary notification sent", {
            employeeId,
          });
        }
      } else {
        logInfo(
          `Employee work anniversary not within ${daysBefore} days range`,
          {
            employeeId,
          },
        );
      }
    }
  } catch (err) {
    logError("Immediate notification check failed", err, { employeeId });
  }
}

export {
  sendBirthdayAlertEmail,
  sendWorkAnniversaryAlertEmail,
  processBirthdayNotifications,
  processWorkAnniversaryNotifications,
  checkAndSendImmediateNotifications,
};
