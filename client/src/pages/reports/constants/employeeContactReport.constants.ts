import {
  SortDirection,
  GenderType,
  EmploymentStatusType,
  FilterOption,
} from "../types/employeeContactReport.types";

export const REPORT_CONFIG = {
  TITLE: "Employee Contact",
  SUBTITLE: "View all employee contact details and addresses",
  SEARCH_PLACEHOLDER:
    "Search by name, ID, email, phone, address, location, job title, sub unit...",
  ITEM_LABEL: "employees",
  EMPTY_ICON_TEXT: "👤",
  EMPTY_TITLE: "No Employees Found",
  EMPTY_SUBTITLE: "No employee records match your current filters",
  EXPORT_BUTTON_LABEL: "Export Excel",
  DEFAULT_SORT_COLUMN: "name",
  DEFAULT_SORT_DIRECTION: SortDirection.ASCENDING,
  INITIAL_PAGE_SIZE: 15,
  PAGE_SIZE_OPTIONS: [10, 15, 20, 50, 100] as const,
} as const;

export const GENDER_FILTER_OPTIONS: FilterOption[] = [
  { value: GenderType.ALL, label: "All Genders" },
  { value: GenderType.MALE, label: "Male" },
  { value: GenderType.FEMALE, label: "Female" },
  { value: GenderType.OTHER, label: "Other" },
];

export const EMPLOYMENT_STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: EmploymentStatusType.ALL, label: "All Status" },
  { value: EmploymentStatusType.FULL_TIME, label: "Full-Time" },
  { value: EmploymentStatusType.PART_TIME, label: "Part-Time" },
  { value: EmploymentStatusType.CONTRACT, label: "Contract" },
  { value: EmploymentStatusType.PROBATION, label: "Probation" },
];

export const COLUMN_LABELS = {
  EMPLOYEE_ID: "Employee ID",
  FIRST_NAME: "First Name",
  MIDDLE_NAME: "Middle Name",
  LAST_NAME: "Last Name",
  NAME: "Name",
  EMAIL: "Email",
  MOBILE: "Mobile",
  HOME_TEL: "Home Phone",
  WORK_TEL: "Work Phone",
  DOB: "Date of Birth",
  SUPERVISORS: "Supervisors",
  ADDRESS: "Address",
  LOCATION: "Location",
  SUB_UNIT: "Sub Unit",
  JOB_TITLE: "Job Title",
  GENDER: "Gender",
  STATUS: "Status",
  NOT_AVAILABLE: "N/A",
  NO_SUPERVISORS: "No Supervisors",
} as const;

export const ERROR_MESSAGES = {
  LOAD_FAILED: "Failed to load the employee contact report.",
  EXPORT_FAILED: "Failed to export the report.",
} as const;

export const SUCCESS_MESSAGES = {
  EXPORT_SUCCESS: "Employee contact report downloaded successfully.",
} as const;

export const SORTABLE_COLUMN_KEYS = [
  "employee_id",
  "first_name",
  "middle_name",
  "last_name",
  "name",
  "dob",
  "email",
  "mobile",
  "home_tel",
  "work_tel",
  "location",
  "sub_unit",
  "job_title",
  "gender",
  "employment_status",
] as const;

export const TAILWIND_CLASSES = {
  FILTER_TOOLBAR: "flex gap-3 flex-wrap items-center",
  SELECT_INPUT:
    "py-2 px-3 border-[1.5px] border-slate-200 rounded-md text-[13px] outline-none focus:border-[#172554] transition-colors bg-white",
  EXPORT_BUTTON:
    "py-2 px-4 bg-[#16A085] text-white border-none rounded-md text-[13px] font-semibold cursor-pointer hover:bg-[#138f72] transition-colors",
  RESET_BUTTON:
    "py-2 px-4 bg-slate-200 text-slate-700 border-none rounded-md text-[13px] font-semibold cursor-pointer hover:bg-slate-300 transition-colors",
  TEXT_SLATE: "text-slate-700",
  TEXT_MEDIUM: "text-slate-700 font-medium",
  TEXT_ITALIC_SMALL: "text-slate-400 italic text-xs",
  TEXT_SMALL: "text-slate-700 text-xs",
  SUPERVISOR_TAG:
    "text-xs text-slate-700 bg-blue-50 px-2 py-1 rounded-md inline-block",
  EMAIL_LINK: "text-blue-600 hover:underline",
  EMPLOYEE_ID_TEXT: "font-semibold text-navy-700",
  EMPLOYEE_NAME_TEXT: "font-semibold text-slate-800",
  AVATAR_CONTAINER:
    "w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-[#172554] to-[#14b8a6] flex items-center justify-center text-white text-xs font-bold",
  NAME_CONTAINER: "flex items-center gap-2",
  SUPERVISOR_CONTAINER: "flex flex-col gap-1",
} as const;
