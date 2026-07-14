export const ACTION_COLORS = {
  CREATE: {
    backgroundColor: "#dcfce7",
    textColor: "#16a34a",
    indicatorColor: "#22c55e",
  },
  UPDATE: {
    backgroundColor: "#fef9c3",
    textColor: "#a16207",
    indicatorColor: "#eab308",
  },
  DELETE: {
    backgroundColor: "#fee2e2",
    textColor: "#dc2626",
    indicatorColor: "#ef4444",
  },
  TERMINATE: {
    backgroundColor: "#fce7f3",
    textColor: "#9d174d",
    indicatorColor: "#ec4899",
  },
} as const;

export type AuditAction = keyof typeof ACTION_COLORS;

export const ROLE_OPTIONS = [
  {
    value: "employee",
    label: "Employee",
    color: "#16a34a",
    bg: "#dcfce7",
    border: "#bbf7d0",
  },
  {
    value: "supervisor",
    label: "Supervisor",
    color: "#075985",
    bg: "#e0f2fe",
    border: "#bae6fd",
  },
  {
    value: "hradmin",
    label: "Global Admin",
    color: "#7c3aed",
    bg: "#ede9fe",
    border: "#c4b5fd",
  },
] as const;

export type RoleOption = (typeof ROLE_OPTIONS)[number];

export const TERMINATION_TYPE_COLORS: Record<string, string> = {
  Voluntary: "#16A085",
  Involuntary: "#E53E3E",
  Retirement: "#7C3AED",
  Layoff: "#F97316",
  "End of Contract": "#3B82F6",
} as const;

export const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export type MonthOption = (typeof MONTH_OPTIONS)[number];

export const YEARS_OF_SERVICE_OPTIONS = [1, 2, 3, 5, 10, 15, 20, 25] as const;

export type YearsOfService = (typeof YEARS_OF_SERVICE_OPTIONS)[number];

export const LEAVE_STATUS_COLORS = {
  approved: "bg-green-500",
  "pending approval": "bg-yellow-500",
  rejected: "bg-red-500",
  cancelled: "bg-gray-500",
  default: "bg-blue-500",
} as const;

export const LEAVE_STATUS_BADGE_COLORS = {
  Approved: "bg-green-100 text-green-800",
  "Pending Approval": "bg-yellow-100 text-yellow-800",
  Rejected: "bg-red-100 text-red-800",
  Cancelled: "bg-gray-100 text-gray-800",
} as const;

export const THEME_COLORS = {
  text: {
    primary: "text-slate-800",
    secondary: "text-slate-600",
    tertiary: "text-slate-500",
    link: "text-blue-600",
    teal: "text-teal-600",
  },
  slate: {
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
  },
  navy: {
    900: "#1b2a6b",
  },
  teal: {
    500: "#16a085",
    600: "#00897b",
  },
  blue: {
    600: "#007bff",
  },
} as const;
