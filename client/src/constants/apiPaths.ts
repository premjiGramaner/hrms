/**
 * Central registry of API paths used by the client.
 *
 * All API paths (both static endpoints and dynamic-segment builders) live here so
 * they can be shared across `src/api/*.api.ts` modules and any component that
 * needs to talk to the backend directly. Grouped by domain to keep concerns
 * separated.
 *
 * Two conventions:
 *   - Static endpoints: uppercase string constants (e.g. `AUTH_PATHS.LOGIN`).
 *   - Dynamic endpoints: camelCase functions that accept the id(s) and return
 *     the interpolated path (e.g. `EMPLOYEE_PATHS.byId(42)`).
 */

/** Auth endpoints */
export const AUTH_PATHS = {
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  PROFILE: "/auth/profile",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  VERIFY_TOKEN: "/auth/verify-token",
  SET_PASSWORD: "/auth/set-password",
} as const;

/** Employee endpoints */
export const EMPLOYEE_PATHS = {
  BASE: "/employees",
  SUPERIORS: "/employees/superiors",
  MY_INFO: "/employees/my-info",
  SUPERVISORS: "/employees/supervisors",
  SUPERVISORS_BY_IDS: "/employees/supervisors-by-ids",
  LOCATIONS: "/employees/locations",
  CHECK_EMAIL: "/employees/check-email",
  CHECK_EMPLOYEE_ID: "/employees/check-employee-id",
  LAST_EMPLOYEE_ID: "/employees/last-employee-id",
  byId: (id: number | string) => `/employees/${id}`,
  terminate: (id: number | string) => `/employees/${id}/terminate`,
  profileImage: (id: number | string) => `/employees/${id}/profile-image`,
} as const;

/** Role endpoints */
export const ROLE_PATHS = {
  BASE: "/roles",
  byId: (id: number | string) => `/roles/${id}`,
} as const;

/** Leave endpoints (requests, balances, exports) */
export const LEAVE_PATHS = {
  BASE: "/leaves",
  TYPES: "/leaves/types",
  FILTER_OPTIONS: "/leaves/filter-options",
  EMPLOYEES_SEARCH: "/leaves/employees/search",
  BALANCE: "/leaves/balance",
  EXPORT_SUMMARY: "/api/leaves/export/summary",
  EXPORT_DETAIL: "/api/leaves/export/detail",
  byId: (id: number | string) => `/leaves/${id}`,
  details: (id: number | string) => `/leaves/${id}/details`,
  attachment: (id: number | string) => `/leaves/${id}/attachment`,
  approve: (id: number | string) => `/leaves/${id}/approve`,
  reject: (id: number | string) => `/leaves/${id}/reject`,
  cancel: (id: number | string) => `/leaves/${id}/cancel`,
} as const;

/** Leave entitlement endpoints */
export const ENTITLEMENT_PATHS = {
  BASE: "/leave/entitlements",
  EMPLOYEES: "/leave/entitlements/employees",
  LEAVE_TYPES: "/leave/entitlements/leave-types",
  MY: "/leave/entitlements/my",
} as const;

/** HR admin endpoints */
export const HRADMIN_PATHS = {
  USERS: "/hradmin/users",
  userById: (id: number | string) => `/hradmin/users/${id}`,
  userToggleStatus: (id: number | string) =>
    `/hradmin/users/${id}/toggle-status`,
  JOB_TITLES: "/hradmin/job-titles",
  jobTitleById: (id: number | string) => `/hradmin/job-titles/${id}`,
  JOB_CATEGORIES: "/hradmin/job-categories",
  jobCategoryById: (id: number | string) => `/hradmin/job-categories/${id}`,
  SUB_UNITS: "/hradmin/sub-units",
  subUnitById: (id: number | string) => `/hradmin/sub-units/${id}`,
  AUDIT_TRAIL: "/hradmin/audit-trail",
  ROLE_ACCESS: "/hradmin/role-access",
  roleAccessById: (id: number | string) => `/hradmin/role-access/${id}`,
} as const;

/** Performance module endpoints */
export const PERFORMANCE_PATHS = {
  TEMPLATES: "/performance/templates",
  templateById: (id: string) => `/performance/templates/${id}`,
  cloneTemplate: (id: string) => `/performance/templates/${id}/clone`,
  templateKpis: (templateId: string) =>
    `/performance/templates/${templateId}/kpis`,
  templateKpiById: (templateId: string, questionId: string) =>
    `/performance/templates/${templateId}/kpis/${questionId}`,
  EMPLOYEES: "/performance/employees",
  CYCLES: "/performance/cycles",
  cycleById: (id: string) => `/performance/cycles/${id}`,
  cycleStatus: (id: string) => `/performance/cycles/${id}/status`,
  cycleDownload: (id: string) => `/performance/cycles/${id}/download`,
  cycleEmployees: (cycleId: string) =>
    `/performance/cycles/${cycleId}/employees`,
  cycleEmployeeById: (cycleId: string, employeeId: string) =>
    `/performance/cycles/${cycleId}/employees/${employeeId}`,
  cycleAppraisals: (cycleId: string) =>
    `/performance/cycles/${cycleId}/appraisals`,
  APPRAISALS: "/performance/appraisals",
  MY_APPRAISALS: "/performance/appraisals/my",
  appraisalById: (id: string) => `/performance/appraisals/${id}`,
  appraisalDownload: (id: string) => `/performance/appraisals/${id}/download`,
  appraisalRatings: (id: string) => `/performance/appraisals/${id}/ratings`,
  appraisalSubmit: (id: string) => `/performance/appraisals/${id}/submit`,
  TRACKERS: "/performance/trackers",
  COMPETENCY_PROFILES: "/performance/competency-profiles",
} as const;

/** Report endpoints */
export const REPORT_PATHS = {
  TERMINATION: "/reports/termination",
  TERMINATION_EXPORT_EXCEL: "/reports/termination/export/excel",
  TERMINATION_EXPORT_PDF: "/reports/termination/export/pdf",
  BIRTHDAY: "/reports/birthday",
  BIRTHDAY_EXPORT_EXCEL: "/reports/birthday/export/excel",
  WORK_ANNIVERSARY: "/reports/work-anniversary",
  WORK_ANNIVERSARY_EXPORT_EXCEL: "/reports/work-anniversary/export/excel",
  NOTIFICATION_CONFIG: "/reports/notification-config",
  FILTER_OPTIONS: "/reports/filter-options",
  TRIGGER_NOTIFICATIONS: "/reports/trigger-notifications",
  LEAVE_BY_DEPARTMENT: "/reports/leave-by-department",
  LEAVE_BY_DEPARTMENT_FILTER_OPTIONS:
    "/reports/leave-by-department/filter-options",
  LEAVE_BY_DEPARTMENT_EXPORT_PDF:
    "/reports/leave-by-department/export/pdf",
} as const;
