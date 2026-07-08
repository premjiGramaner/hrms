import cron from 'node-cron';
import { processBirthdayNotifications, processWorkAnniversaryNotifications } from '../services/reportNotification.service.js';

export function initializeReportNotificationScheduler() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[Report Notification Scheduler] Running daily notification check at', new Date().toLocaleString());
    
    try {
      const birthdayResult = await processBirthdayNotifications();
      console.log('[Birthday Notifications]', birthdayResult.message);

      const anniversaryResult = await processWorkAnniversaryNotifications();
      console.log('[Work Anniversary Notifications]', anniversaryResult.message);
    } catch (err) {
      console.error('[Report Notification Scheduler] Error:', err);
    }
  });

  console.log('[Report Notification Scheduler] Initialized - Daily run at 8:00 AM');
}

export async function triggerNotificationsManually() {
  
  const birthdayResult = await processBirthdayNotifications();
  const anniversaryResult = await processWorkAnniversaryNotifications();

  return {
    birthday: birthdayResult,
    work_anniversary: anniversaryResult,
  };
}
