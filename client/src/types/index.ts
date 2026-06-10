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
  is_active?: boolean;
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
}

export interface UserRole {
  id: number;
  role_name: string;
  role_type?: string;
  description?: string;
  is_active: boolean;
}
