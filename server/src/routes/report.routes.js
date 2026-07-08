import express from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import {
  getTerminationReport,
  getBirthdayReport,
  getWorkAnniversaryReport,
  exportTerminationReportExcel,
  exportBirthdayReportExcel,
  exportWorkAnniversaryReportExcel,
  exportTerminationReportPDF,
  getNotificationConfig,
  updateNotificationConfig,
  getReportFilterOptions,
  triggerNotificationsManually,
} from "../controllers/report.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Termination Report (Admin access only)
router.get(
  "/termination",
  requireRole("hradmin", "empmanager"),
  getTerminationReport,
);
router.get(
  "/termination/export/excel",
  requireRole("hradmin", "empmanager"),
  exportTerminationReportExcel,
);
router.get(
  "/termination/export/pdf",
  requireRole("hradmin", "empmanager"),
  exportTerminationReportPDF,
);

// Birthday Report (All authenticated users with role-based filtering)
router.get("/birthday", getBirthdayReport);
router.get("/birthday/export/excel", exportBirthdayReportExcel);

// Work Anniversary Report (All authenticated users with role-based filtering)
router.get("/work-anniversary", getWorkAnniversaryReport);
router.get("/work-anniversary/export/excel", exportWorkAnniversaryReportExcel);

// Notification Configuration (Admin only)
router.get(
  "/notification-config",
  requireRole("hradmin"),
  getNotificationConfig,
);
router.put(
  "/notification-config",
  requireRole("hradmin"),
  updateNotificationConfig,
);

// Filter options for dropdowns
router.get("/filter-options", getReportFilterOptions);

// Manual trigger for testing notifications (Admin only)
router.post(
  "/trigger-notifications",
  requireRole("hradmin"),
  triggerNotificationsManually,
);

export default router;
