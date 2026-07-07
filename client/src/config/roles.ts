export const ADMIN_ROLES = ["empmanager", "hradmin"];
export const SUPERVISOR_ROLES = [
  "supervisor",
  "manager",
  "line_manager",
  "reporting_manager",
];

export function isAdminRole(role?: string | null) {
  return ADMIN_ROLES.includes(role || "");
}

export function isSupervisorRole(role?: string | null) {
  return SUPERVISOR_ROLES.includes(role || "");
}

export function getRoleLabel(role?: string | null) {
  switch (role) {
    case "empmanager":
      return "Employee Manager";
    case "hradmin":
      return "HR Administrator";
    case "supervisor":
      return "Supervisor";
    case "manager":
      return "Manager";
    case "line_manager":
      return "Line Manager";
    case "reporting_manager":
      return "Reporting Manager";
    default:
      return "Employee";
  }
}
