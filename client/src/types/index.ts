export interface Employee {
  id: number;
  employee_id?: string;
  name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  username: string;
  role: string;
  status: string;
  mobile?: string;
  avatar?: string;
  job_title?: string;
  joined_date?: string;
  sub_unit?: string;
  gender?: string;
  marital_status?: string;
  nationality?: string;
  dob?: string;
  real_dob?: string;
  blood_group?: string;
  work_email?: string;
  other_email?: string;
  home_tel?: string;
  work_tel?: string;
  address1?: string;
  address2?: string;
  city?: string;
  country?: string;
  state?: string;
  zip?: string;
  location?: string;
  license_number?: string;
  license_expiry?: string;
  probation_end_date?: string;
  date_of_permanence?: string;
  employment_status?: string;
  job_specification?: string;
  job_category?: string;
  attendance_calc?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  comments?: string;
  supervisors?: string[];
  supervisor_names?: string[];
  is_active?: boolean;
}

export interface Supervisor {
  id: number;
  name: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  name: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
}

export interface UserRole {
  id: number;
  role_name: string;
  role_type?: string;
  description?: string;
  is_active: boolean;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  description?: string;
  max_days?: number;
  carry_forward?: boolean;
  is_active?: boolean;
}

export interface LeaveRequest {
  id: number;
  employee_id?: string;
  employee_name?: string;
  user_id?: number;
  leave_type_id: number;
  leave_type?: string;
  leave_type_code?: string;
  start_date: string;
  end_date: string;
  applied_on?: string;
  requested_days: number;
  status: string;
  reason?: string;
  rejection_reason?: string;
  attachment_path?: string;
  attachment_status?: string;
  comments?: string;
  net_leave_balance?: number;
  sub_unit?: string;
  location?: string;
  job_title?: string;
  employment_status?: string;
  avatar?: string;
  approved_on?: string;
  rejected_on?: string;
  cancelled_on?: string;
}

export interface LeaveBalance {
  leave_type_id: number;
  leave_type_name: string;
  code: string;
  total_days: number;
  used_days: number;
  carried_days: number;
  net_balance: number;
  year: number;
}

export interface LeaveFilters {
  from_date?: string;
  to_date?: string;
  employee_id?: string;
  employee_name?: string;
  sub_unit?: string;
  location?: string;
  leave_type_id?: string;
  job_title?: string;
  employment_status?: string;
  job_category?: string;
  attachment_status?: string;
  include_past?: boolean;
  only_subordinates?: boolean;
  own_employee_id?: number;
  statuses?: string[];
  page?: number;
  limit?: number;
}

export interface TerminationReportRecord {
  id: number;
  emp_id?: string;
  employee_name: string;
  designation?: string;
  group_company?: string;
  reporting_manager?: string;
  location?: string;
  date_of_joining?: string;
  date_of_exit?: string;
  last_working_day?: string;
  termination_reason?: string;
  termination_type?: string;
  notice_period_days?: number;
  exit_interview_completed?: boolean;
  rehire_eligible?: boolean;
  termination_notes?: string;
  terminated_by?: string;
}

export interface BirthdayReportRecord {
  id: number;
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  birthday_date?: string;
  formatted_birthday?: string;
  gender?: string;
  marital_status?: string;
  user_type?: string;
  email?: string;
  mobile?: string;
  avatar?: string;
  job_title?: string;
  location?: string;
  sub_unit?: string;
}

export interface WorkAnniversaryReportRecord {
  id: number;
  employee_id?: string;
  employee_name: string;
  first_name?: string;
  last_name?: string;
  date_of_joining?: string;
  formatted_anniversary?: string;
  years_of_service: number;
  additional_months?: number;
  designation?: string;
  department?: string;
  location?: string;
  email?: string;
  mobile?: string;
  avatar?: string;
  employment_status?: string;
  user_type?: string;
}

export interface ReportPaginatedResponse<T> {
  reportData: T[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}

export interface NotificationConfig {
  id: number;
  notification_type: "birthday" | "work_anniversary";
  recipient_user_ids: number[];
  days_before: number;
  is_active: boolean;
  external_emails?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReportFilterOptions {
  subUnits: string[];
  locations: string[];
}
