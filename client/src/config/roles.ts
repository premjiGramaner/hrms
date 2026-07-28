/**
 * Central definition of all application user roles.
 *
 * Use the `ROLES` constant everywhere instead of hardcoded role string
 * literals so we have a single source of truth. All existing helpers
 * (ADMIN_ROLES, SUPERVISOR_ROLES, isAdminRole, etc.) are derived from it.
 */

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ROLES = {
  EMPLOYEE: "employee",
  EMP_MANAGER: "empmanager",
  HR_ADMIN: "hradmin",
  SUPERVISOR: "supervisor",
  MANAGER: "manager",
  LINE_MANAGER: "line_manager",
  REPORTING_MANAGER: "reporting_manager",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: readonly UserRole[] = [
  ROLES.HR_ADMIN,
  ROLES.EMP_MANAGER,
] as const;

export const BASIC_SUPERVISOR_ROLES: readonly UserRole[] = [
  ROLES.SUPERVISOR,
  ROLES.MANAGER,
] as const;

export const SUPERVISOR_ROLES: readonly UserRole[] = [
  ROLES.SUPERVISOR,
  ROLES.MANAGER,
  ROLES.LINE_MANAGER,
  ROLES.REPORTING_MANAGER,
] as const;

export function isAdminRole(role?: UserRole | string | null): boolean {
  return ADMIN_ROLES.includes(role as UserRole);
}

export function isSupervisorRole(role?: UserRole | string | null): boolean {
  return SUPERVISOR_ROLES.includes(role as UserRole);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [ROLES.EMP_MANAGER]: "Employee Manager",
  [ROLES.HR_ADMIN]: "HR Administrator",
  [ROLES.EMPLOYEE]: "Employee",
  [ROLES.SUPERVISOR]: "Supervisor",
  [ROLES.MANAGER]: "Manager",
  [ROLES.LINE_MANAGER]: "Line Manager",
  [ROLES.REPORTING_MANAGER]: "Reporting Manager",
};

export function getRoleLabel(role?: UserRole | string | null): string {
  if (role && (role as UserRole) in ROLE_LABELS) {
    return ROLE_LABELS[role as UserRole];
  }
  return ROLE_LABELS[ROLES.EMPLOYEE];
}

/**
 * Centralized navigation/page paths used across the client.
 *
 * - Static entries are plain strings.
 * - Dynamic entries are functions. Calling them with no argument returns the
 *   route pattern (e.g. `/employees/:id/profile`) suitable for `<Route path=...>`.
 *   Calling them with a value returns the concrete URL suitable for `navigate(...)`
 *   and `<Link to=...>`.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const PAGE_PATHS = {
  // Auth
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  createPassword: "/create-password",

  // Root
  home: "/",

  // Employees
  employees: "/employees",
  employeesSuperior: "/employees/superior-section",
  employeeProfile: (id: string | number = ":id") => `/employees/${id}/profile`,
  myInfo: "/my-info",

  // Roles
  roles: "/roles",

  // HR Admin
  hradmin: "/hradmin",
  hradminUsers: "/hradmin/users",
  hradminAuditTrail: "/hradmin/audit-trail",
  hradminJobTitles: "/hradmin/job-titles",
  hradminJobCategories: "/hradmin/job-categories",
  hradminSubUnits: "/hradmin/sub-units",
  hradminRoleAccess: "/hradmin/role-access",

  // Leave
  leave: "/leave",
  leaveList: "/leave/view_leave_list",
  leaveDetails: (id: string | number = ":id") =>
    `/leave/view_leave_list/details/${id}`,
  myLeaveDetail: (id: string | number = ":id") =>
    `/view_my_leave_list/detail/${id}/my`,
  leaveApply: "/leave/apply",
  leaveConfigure: "/leave/configure",
  leaveEntitlements: "/leave/entitlements",
  leaveEntitlementsAdd: "/leave/entitlements/add",
  leaveEntitlementsList: "/leave/entitlements/list",
  leaveEntitlementsMy: "/leave/entitlements/my",
  leaveMyEntitlement: "/leave/view_my_leave_entitlement",

  // Performance
  performance: "/performance",
  performanceAppraisalsList: "/performance/appraisals_list",
  performanceMyAppraisals: "/performance/my_appraisals",
  performanceTeamAppraisals: "/performance/team_appraisals",
  performanceTrackers: "/performance/trackers",
  performanceCompetencyProfiles: "/performance/competency_profiles",
  performanceAppraisalCycles: "/performance/appraisal_cycles",
  performanceAppraisalCyclesCreate: "/performance/appraisal_cycles/create",
  performanceAppraisalCycle: (id: string | number = ":id") =>
    `/performance/appraisal_cycles/${id}`,
  performanceAppraisalCycleAddEmployees: (id: string | number = ":id") =>
    `/performance/appraisal_cycles/${id}/add-employees`,
  performanceAppraisalView: (id: string | number = ":id") =>
    `/performance/appraisals/${id}/view`,
  performanceAppraisalReview: (id: string | number = ":id") =>
    `/performance/appraisals/${id}/review`,
  performanceConfigAppraisal: "/performance/configuration/appraisal",
  performanceTemplateDesign: (id: string | number = ":templateId") =>
    `/performance/configuration/appraisal/templates/${id}/design`,

  // Reports
  reports: "/reports",
  reportsBirthday: "/reports/birthday",
  reportsWorkAnniversary: "/reports/work-anniversary",
  reportsTermination: "/reports/termination",
  reportsNotifications: "/reports/notifications",
  reportsLeaveByDepartment: "/reports/leave-by-department",
  reportsEmployeeContact: "/reports/employee-contact",
} as const;
