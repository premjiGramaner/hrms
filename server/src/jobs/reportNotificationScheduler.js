import cron from 'node-cron';
import { processBirthdayNotifications, processWorkAnniversaryNotifications } from '../services/reportNotification.service.js';

/**
 * Schedule Report Notifications
 * Runs daily at 8:00 AM to check for upcoming birthdays and work anniversaries
 */
export function initializeReportNotificationScheduler() {
  // Run every day at 8:00 AM (server time)
  cron.schedule('0 8 * * *', async () => {
    console.log('[Report Notification Scheduler] Running daily notification check at', new Date().toLocaleString());
    
    try {
      // Process birthday notifications
      const birthdayResult = await processBirthdayNotifications();
      console.log('[Birthday Notifications]', birthdayResult.message);

      // Process work anniversary notifications
      const anniversaryResult = await processWorkAnniversaryNotifications();
      console.log('[Work Anniversary Notifications]', anniversaryResult.message);
    } catch (err) {
      console.error('[Report Notification Scheduler] Error:', err);
    }
  });

  console.log('[Report Notification Scheduler] Initialized - Daily run at 8:00 AM');
}

/**
 * Manual trigger for testing notifications (optional)
 */
export async function triggerNotificationsManually() {
  console.log('[Manual Trigger] Processing notifications...');
  
  const birthdayResult = await processBirthdayNotifications();
  const anniversaryResult = await processWorkAnniversaryNotifications();

  return {
    birthday: birthdayResult,
    work_anniversary: anniversaryResult,
  };
}
