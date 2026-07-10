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

  console.log(
    `[Birthday Notification] Sending email to: ${recipientEmails.join(", ")}`,
  );
  console.log(
    `[Birthday Notification] ${upcomingBirthdaysData.length} birthday(s) to notify`,
  );

  try {
    await transporter.sendMail({
      from: mailFrom,
      to: recipientEmails.join(", "),
      subject,
      html,
    });
    console.log("[Birthday Notification] ✅ Email sent successfully");
    return {
      success: true,
      message: `Birthday alert email sent successfully to ${recipientEmails.length} recipient(s)`,
    };
  } catch (err) {
    console.error("[Birthday Notification] ❌ Email send error:", err);
    return { success: false, message: err.message };
  }
}

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

  console.log(
    `[Anniversary Notification] Sending email to: ${recipientEmails.join(", ")}`,
  );
  console.log(
    `[Anniversary Notification] ${upcomingAnniversariesData.length} anniversary(ies) to notify`,
  );

  try {
    await transporter.sendMail({
      from: mailFrom,
      to: recipientEmails.join(", "),
      subject,
      html,
    });
    console.log("[Anniversary Notification] ✅ Email sent successfully");
    return {
      success: true,
      message: `Work anniversary alert email sent successfully to ${recipientEmails.length} recipient(s)`,
    };
  } catch (err) {
    console.error("[Anniversary Notification] ❌ Email send error:", err);
    return { success: false, message: err.message };
  }
}
async function processBirthdayNotifications() {
  try {
    console.log("[Birthday Notifications] Starting processing...");

    const notificationConfig =
      await ReportModel.getNotificationConfig("birthday");

    if (!notificationConfig || !notificationConfig.is_active) {
      console.log("[Birthday Notifications] ⚠️ Notifications are disabled");
      return { success: false, message: "Birthday notifications disabled" };
    }

    const daysBefore = notificationConfig.days_before || 0;
    console.log(
      `[Birthday Notifications] Checking for birthdays from TODAY to ${daysBefore} day(s) ahead...`,
    );

    const upcomingBirthdays =
      await ReportModel.getUpcomingBirthdays(daysBefore);

    console.log(
      `[Birthday Notifications] Found ${upcomingBirthdays.length} upcoming birthday(s)`,
    );

    if (upcomingBirthdays.length === 0) {
      return {
        success: true,
        message: `No birthdays found from today to ${daysBefore} day(s) ahead`,
      };
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
    console.log(
      `[Birthday Notifications] Global admin emails (auto): ${recipientEmails.join(", ")}`,
    );

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
      console.log(
        `[Birthday Notifications] Added ${externalEmails.length} external email(s)`,
      );
    }

    if (recipientEmails.length === 0) {
      console.log("[Birthday Notifications] ⚠️ No recipient emails configured");
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
    console.error("[Birthday Notifications] ❌ Error:", err);
    return { success: false, message: err.message };
  }
}

async function processWorkAnniversaryNotifications() {
  try {
    const notificationConfig =
      await ReportModel.getNotificationConfig("work_anniversary");

    if (!notificationConfig || !notificationConfig.is_active) {
      console.log("[Anniversary Notifications] ⚠️ Notifications are disabled");
      return {
        success: false,
        message: "Work anniversary notifications disabled",
      };
    }

    const daysBefore = notificationConfig.days_before || 0;
    console.log(
      `[Anniversary Notifications] Checking for anniversaries from TODAY to ${daysBefore} day(s) ahead...`,
    );

    const upcomingAnniversaries =
      await ReportModel.getUpcomingWorkAnniversaries(daysBefore);

    console.log(
      `[Anniversary Notifications] Found ${upcomingAnniversaries.length} upcoming anniversary(ies)`,
    );

    if (upcomingAnniversaries.length === 0) {
      return {
        success: true,
        message: `No work anniversaries found from today to ${daysBefore} day(s) ahead`,
      };
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
      console.log(
        "[Anniversary Notifications] ⚠️ No recipient emails configured",
      );
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
    console.error("[Anniversary Notifications] ❌ Error:", err);
    return { success: false, message: err.message };
  }
}

async function checkAndSendImmediateNotifications(employeeId) {
  try {
    console.log(
      `[Immediate Notification] Checking for employee ID: ${employeeId}`,
    );

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
        console.log(
          `[Immediate Notification] ✅ Employee's birthday falls within ${daysBefore} days range!`,
        );

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
          console.log(
            `[Immediate Notification] ✅ Birthday notification sent for new employee`,
          );
        }
      } else {
        console.log(
          `[Immediate Notification] ℹ️ Employee's birthday not within ${daysBefore} days range`,
        );
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
          console.log(
            `[Immediate Notification] ✅ Work anniversary notification sent for new employee`,
          );
        }
      } else {
        console.log(
          `[Immediate Notification] ℹ️ Employee's work anniversary not within ${daysBefore} days range`,
        );
      }
    }
  } catch (err) {
    console.error("[Immediate Notification] ❌ Error:", err);
  }
}

export {
  sendBirthdayAlertEmail,
  sendWorkAnniversaryAlertEmail,
  processBirthdayNotifications,
  processWorkAnniversaryNotifications,
  checkAndSendImmediateNotifications,
};
