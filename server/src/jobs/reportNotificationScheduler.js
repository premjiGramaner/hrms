import cron from "node-cron";
import {
  processBirthdayNotifications,
  processWorkAnniversaryNotifications,
} from "../services/reportNotification.service.js";

export function initializeReportNotificationScheduler() {
  cron.schedule("0 8 * * *", async () => {
    try {
      const birthdayResult = await processBirthdayNotifications();
      console.log(
        `[Report Notification Scheduler] Birthday Result: ${birthdayResult.success ? "✅" : "❌"} ${birthdayResult.message}`,
      );
      const anniversaryResult = await processWorkAnniversaryNotifications();
    } catch (err) {
      console.error("[Report Notification Scheduler] ❌ Critical Error:", err);
    }
  });

  console.log(
    "[Report Notification Scheduler] ✓ Initialized - Daily run at 8:00 AM",
  );
}

export async function triggerNotificationsManually() {
  const birthdayResult = await processBirthdayNotifications();
  const anniversaryResult = await processWorkAnniversaryNotifications();

  return {
    birthday: birthdayResult,
    work_anniversary: anniversaryResult,
  };
}
