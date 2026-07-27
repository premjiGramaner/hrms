import express from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
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
import {
  exportLeaveByDepartmentReportPdf,
  getLeaveByDepartmentReport,
  getLeaveByDepartmentReportFilterOptions,
} from "../controllers/leaveDepartmentReport.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Termination Report (Admin access only)
router.get(
  "/termination",
  requireRole(ROLES.HR_ADMIN, ROLES.EMP_MANAGER),
  getTerminationReport,
);
router.get(
  "/termination/export/excel",
  requireRole(ROLES.HR_ADMIN, ROLES.EMP_MANAGER),
  exportTerminationReportExcel,
);
router.get(
  "/termination/export/pdf",
  requireRole(ROLES.HR_ADMIN, ROLES.EMP_MANAGER),
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
  requireRole(ROLES.HR_ADMIN),
  getNotificationConfig,
);
router.put(
  "/notification-config",
  requireRole(ROLES.HR_ADMIN),
  updateNotificationConfig,
);

// Filter options for dropdowns
router.get("/filter-options", getReportFilterOptions);

// Leave taken by department (Admin access only)
router.get(
  "/leave-by-department",
  requireRole(ROLES.HR_ADMIN, ROLES.EMP_MANAGER),
  getLeaveByDepartmentReport,
);
router.get(
  "/leave-by-department/filter-options",
  requireRole(ROLES.HR_ADMIN, ROLES.EMP_MANAGER),
  getLeaveByDepartmentReportFilterOptions,
);
router.get(
  "/leave-by-department/export/pdf",
  requireRole(ROLES.HR_ADMIN, ROLES.EMP_MANAGER),
  exportLeaveByDepartmentReportPdf,
);

// Manual trigger for testing notifications (Admin only)
router.post(
  "/trigger-notifications",
  requireRole(ROLES.HR_ADMIN),
  triggerNotificationsManually,
);

export default router;
