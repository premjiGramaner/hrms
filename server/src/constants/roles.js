/**
 * Central definition of all application user roles.
 *
 * Kept in sync with `client/src/config/roles.ts`. Use the `ROLES` constant
 * everywhere instead of hardcoded role string literals.
 */

const ROLES = Object.freeze({
  EMPLOYEE: "employee",
  EMP_MANAGER: "empmanager",
  HR_ADMIN: "hradmin",
  SUPERVISOR: "supervisor",
  MANAGER: "manager",
  LINE_MANAGER: "line_manager",
  REPORTING_MANAGER: "reporting_manager",
});

const ADMIN_ROLES = Object.freeze([ROLES.HR_ADMIN, ROLES.EMP_MANAGER]);

const BASIC_SUPERVISOR_ROLES = Object.freeze([
  ROLES.SUPERVISOR,
  ROLES.MANAGER,
]);

const SUPERVISOR_ROLES = Object.freeze([
  ROLES.SUPERVISOR,
  ROLES.MANAGER,
  ROLES.LINE_MANAGER,
  ROLES.REPORTING_MANAGER,
]);

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function isSupervisorRole(role) {
  return SUPERVISOR_ROLES.includes(role);
}

export {
  ROLES,
  ADMIN_ROLES,
  BASIC_SUPERVISOR_ROLES,
  SUPERVISOR_ROLES,
  isAdminRole,
  isSupervisorRole,
};
