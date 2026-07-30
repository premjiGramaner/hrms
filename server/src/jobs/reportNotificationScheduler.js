import cron from "node-cron";
import {
  processBirthdayNotifications,
  processWorkAnniversaryNotifications,
} from "../services/reportNotification.service.js";
import { logScheduler, logError } from "../utils/logger.js";
import pool from "../config/db.js";

const NOTIFICATION_JOB_LOCK_ID = 743210;
const NOTIFICATION_TIMEZONE =
  process.env.NOTIFICATION_TIMEZONE || "Asia/Kolkata";

async function runNotificationBatch(source) {
  const client = await pool.connect();
  let lockAcquired = false;
  try {
    const { rows } = await client.query(
      "SELECT pg_try_advisory_lock($1) AS acquired",
      [NOTIFICATION_JOB_LOCK_ID],
    );
    lockAcquired = Boolean(rows[0]?.acquired);
    if (!lockAcquired) {
      logScheduler("Notification batch skipped because another instance is running", {
        source,
      });
      return {
        skipped: true,
        message: "Another notification batch is already running.",
      };
    }

    const force = source === "manual";
    const birthdayResult = await processBirthdayNotifications({ force });
    const anniversaryResult = await processWorkAnniversaryNotifications({
      force,
    });
    return {
      birthday: birthdayResult,
      work_anniversary: anniversaryResult,
    };
  } finally {
    if (lockAcquired) {
      await client
        .query("SELECT pg_advisory_unlock($1)", [NOTIFICATION_JOB_LOCK_ID])
        .catch((error) =>
          logError("Failed to release notification scheduler lock", error),
        );
    }
    client.release();
  }
}

export function initializeReportNotificationScheduler() {
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        logScheduler("Daily notification job started", {
          time: "8:00 AM",
          timezone: NOTIFICATION_TIMEZONE,
        });

        const result = await runNotificationBatch("scheduler");
        if (result.skipped) return;

        const birthdayResult = result.birthday;
        logScheduler(
          `Birthday notification result: ${birthdayResult.success ? "SUCCESS" : "FAILED"}`,
          { message: birthdayResult.message },
        );

        const anniversaryResult = result.work_anniversary;
        logScheduler(
          `Work anniversary notification result: ${anniversaryResult.success ? "SUCCESS" : "FAILED"}`,
          { message: anniversaryResult.message },
        );

        logScheduler("Daily notification job completed");
      } catch (err) {
        logError("Report notification scheduler critical error", err);
      }
    },
    { timezone: NOTIFICATION_TIMEZONE },
  );

  logScheduler("Report notification scheduler initialized", {
    schedule: "0 8 * * * (Daily at 8:00 AM)",
    timezone: NOTIFICATION_TIMEZONE,
  });
}

export async function triggerNotificationsManually() {
  logScheduler("Manual notification trigger started");

  const result = await runNotificationBatch("manual");
  if (result.skipped) {
    const skippedResult = {
      success: true,
      message: result.message,
      skipped: true,
    };
    return {
      birthday: skippedResult,
      work_anniversary: skippedResult,
      skipped: true,
    };
  }

  const birthdayResult = result.birthday;
  const anniversaryResult = result.work_anniversary;

  logScheduler("Manual notification trigger completed", {
    birthdaySuccess: birthdayResult.success,
    anniversarySuccess: anniversaryResult.success,
  });

  return {
    birthday: birthdayResult,
    work_anniversary: anniversaryResult,
  };
}
