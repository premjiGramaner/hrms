import express from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import {
  getTerminationReport,
  getBirthdayReport,
  getWorkAnniversaryReport,
  getEmployeeContactReport,
  exportTerminationReportExcel,
  exportBirthdayReportExcel,
  exportWorkAnniversaryReportExcel,
  exportEmployeeContactReportExcel,
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

router.use(authenticate);

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

router.get("/birthday", getBirthdayReport);
router.get("/birthday/export/excel", exportBirthdayReportExcel);

router.get("/work-anniversary", getWorkAnniversaryReport);
router.get("/work-anniversary/export/excel", exportWorkAnniversaryReportExcel);

router.get(
  "/employee-contact",
  requireRole(ROLES.HR_ADMIN),
  getEmployeeContactReport,
);
router.get(
  "/employee-contact/export/excel",
  requireRole(ROLES.HR_ADMIN),
  exportEmployeeContactReportExcel,
);

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

router.get("/filter-options", getReportFilterOptions);

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

router.post(
  "/trigger-notifications",
  requireRole(ROLES.HR_ADMIN),
  triggerNotificationsManually,
);

export default router;
