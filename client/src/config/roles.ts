export type UserRole =
  | "empmanager"
  | "hradmin"
  | "employee"
  | "supervisor"
  | "manager"
  | "line_manager"
  | "reporting_manager";

export const ADMIN_ROLES: readonly UserRole[] = [
  "empmanager",
  "hradmin",
] as const;

export const BASIC_SUPERVISOR_ROLES: readonly UserRole[] = [
  "supervisor",
  "manager",
] as const;

export const SUPERVISOR_ROLES: readonly UserRole[] = [
  "supervisor",
  "manager",
  "line_manager",
  "reporting_manager",
] as const;

export function isAdminRole(role?: UserRole | string | null): boolean {
  return ADMIN_ROLES.includes(role as UserRole);
}

export function isSupervisorRole(role?: UserRole | string | null): boolean {
  return SUPERVISOR_ROLES.includes(role as UserRole);
}

export function getRoleLabel(role?: UserRole | string | null): string {
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
