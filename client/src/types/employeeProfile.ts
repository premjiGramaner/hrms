import { Employee } from "./index";
import { toInputDate } from "../utils/date";

export interface EditableEmployeeProfileForm {
  first_name: string;
  middle_name: string;
  last_name: string;
  employee_id: string;
  gender: string;
  dob: string;
  real_dob: string;
  nationality: string;
  marital_status: string;
  blood_group: string;
  license_number: string;
  license_expiry: string;
  job_title: string;
  joined_date: string;
  employment_status: string;
  job_category: string;
  job_specification: string;
  sub_unit: string;
  location: string;
  supervisor_id: string;
  probation_end_date: string;
  date_of_permanence: string;
  attendance_calc: string;
  contract_start_date: string;
  contract_end_date: string;
  comments: string;
  work_email: string;
  other_email: string;
  mobile: string;
  home_tel: string;
  work_tel: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

export function employeeToEditableProfileForm(
  employee: Employee,
): EditableEmployeeProfileForm {
  const supervisorId = employee.supervisors?.[0]
    ? String(employee.supervisors[0])
    : "";

  return {
    first_name: employee.first_name || "",
    middle_name: employee.middle_name || "",
    last_name: employee.last_name || "",
    employee_id: employee.employee_id || "",
    gender: employee.gender || "",
    dob: toInputDate(employee.dob),
    real_dob: toInputDate(employee.real_dob),
    nationality: employee.nationality || "",
    marital_status: employee.marital_status || "",
    blood_group: employee.blood_group || "",
    license_number: employee.license_number || "",
    license_expiry: toInputDate(employee.license_expiry),
    job_title: employee.job_title || "",
    joined_date: toInputDate(employee.joined_date),
    employment_status: employee.employment_status || "",
    job_category: employee.job_category || "",
    job_specification: employee.job_specification || "",
    sub_unit: employee.sub_unit || "",
    location: employee.location || "",
    supervisor_id: supervisorId,
    probation_end_date: toInputDate(employee.probation_end_date),
    date_of_permanence: toInputDate(employee.date_of_permanence),
    attendance_calc: employee.attendance_calc || "",
    contract_start_date: toInputDate(employee.contract_start_date),
    contract_end_date: toInputDate(employee.contract_end_date),
    comments: employee.comments || "",
    work_email: employee.email || "",
    other_email: employee.other_email || "",
    mobile: employee.mobile || "",
    home_tel: employee.home_tel || "",
    work_tel: employee.work_tel || "",
    address1: employee.address1 || "",
    address2: employee.address2 || "",
    city: employee.city || "",
    state: employee.state || "",
    country: employee.country || "",
    zip: employee.zip || "",
  };
}
