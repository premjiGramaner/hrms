import type {
  LeaveDepartmentFilterOptions,
  LeaveEmployeeScope,
} from "../../types";

export const CURRENT_REPORT_YEAR = new Date().getFullYear();
export const DEFAULT_LEAVE_STATUS = "Approved";
export const REPORT_FILTER_CONTROL_CLASSES =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition focus:border-navy-700 focus:ring-2 focus:ring-blue-100";

export interface LeaveDepartmentFilters {
  employeeScope: LeaveEmployeeScope;
  year: number | "";
  status: string;
  department: string;
  leaveTypeId: number | "";
  location: string;
  employeeName: string;
}

export type LeaveDepartmentFilterChangeHandler = <
  FilterName extends keyof LeaveDepartmentFilters,
>(
  filterName: FilterName,
  filterValue: LeaveDepartmentFilters[FilterName],
) => void;

export const DEFAULT_LEAVE_DEPARTMENT_FILTERS: LeaveDepartmentFilters = {
  employeeScope: "current",
  year: CURRENT_REPORT_YEAR,
  status: DEFAULT_LEAVE_STATUS,
  department: "",
  leaveTypeId: "",
  location: "",
  employeeName: "",
};

export const EMPTY_LEAVE_DEPARTMENT_FILTER_OPTIONS: LeaveDepartmentFilterOptions =
  {
    years: [],
    departments: [],
    statuses: [],
    leaveTypes: [],
    locations: [],
  };

export function getEmployeeScopeLabel(employeeScope: LeaveEmployeeScope) {
  if (employeeScope === "past") return "Past Employees Only";
  if (employeeScope === "all") return "Current and Past Employees";
  return "Current Employees Only";
}
