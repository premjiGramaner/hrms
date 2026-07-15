import cron from "node-cron";
import {
  processBirthdayNotifications,
  processWorkAnniversaryNotifications,
} from "../services/reportNotification.service.js";
import { logScheduler, logError } from "../utils/logger.js";

export function initializeReportNotificationScheduler() {
  cron.schedule("0 8 * * *", async () => {
    try {
      logScheduler("Daily notification job started", { time: "8:00 AM" });

      const birthdayResult = await processBirthdayNotifications();
      logScheduler(
        `Birthday notification result: ${birthdayResult.success ? "SUCCESS" : "FAILED"}`,
        { message: birthdayResult.message },
      );

      const anniversaryResult = await processWorkAnniversaryNotifications();
      logScheduler(
        `Work anniversary notification result: ${anniversaryResult.success ? "SUCCESS" : "FAILED"}`,
        { message: anniversaryResult.message },
      );

      logScheduler("Daily notification job completed");
    } catch (err) {
      logError("Report notification scheduler critical error", err);
    }
  });

  logScheduler("Report notification scheduler initialized", {
    schedule: "0 8 * * * (Daily at 8:00 AM)",
  });
}

export async function triggerNotificationsManually() {
  logScheduler("Manual notification trigger started");

  const birthdayResult = await processBirthdayNotifications();
  const anniversaryResult = await processWorkAnniversaryNotifications();

  logScheduler("Manual notification trigger completed", {
    birthdaySuccess: birthdayResult.success,
    anniversarySuccess: anniversaryResult.success,
  });

  return {
    birthday: birthdayResult,
    work_anniversary: anniversaryResult,
  };
}
