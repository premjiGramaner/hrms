import {
  EMAIL_PATTERN,
  TEN_DIGIT_NUMBER_PATTERN,
} from "../constants/validationPatterns";

export const validateEmail = (email: string): boolean => {
  return EMAIL_PATTERN.test(email);
};

export { EMAIL_PATTERN as EMAIL_REGEX };

const NAME_REGEX = /^[A-Za-z\s'\-]+$/;

const LICENSE_REGEX = /^[A-Z]{2}\d{2}\d{4}\d{7}$/;

export interface EmployeeFormValues {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  joined_date?: string;
  location?: string;
  gender?: string;
  job_title?: string;
  employment_status?: string;
  work_email?: string;
  other_email?: string;
  mobile?: string;
  work_tel?: string;
  home_tel?: string;
  license_number?: string;
}

export function validateEmployeeStep(
  step: number,
  form: EmployeeFormValues,
  selectedSupervisors: string[],
  availableSupervisorsCount = 0,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 1) {
    const firstName = form.first_name?.trim() || "";
    const lastName = form.last_name?.trim() || "";
    const middleName = form.middle_name?.trim() || "";

    if (!firstName) errors.first_name = "First name is required";
    else if (!NAME_REGEX.test(firstName))
      errors.first_name = "First name must contain letters only";

    if (!lastName) errors.last_name = "Last name is required";
    else if (!NAME_REGEX.test(lastName))
      errors.last_name = "Last name must contain letters only";

    if (middleName && !NAME_REGEX.test(middleName))
      errors.middle_name = "Middle name must contain letters only";

    if (!form.joined_date) errors.joined_date = "Joined date is required";
    if (!form.location) errors.location = "Location is required";
  }

  if (step === 2) {
    if (!form.gender) errors.gender = "Gender is required";

    const licenseNumber = form.license_number?.trim() || "";
    if (licenseNumber && !LICENSE_REGEX.test(licenseNumber)) {
      errors.license_number =
        "License format: 2 letters + 2 digits + 4-digit year + 7 digits (e.g. TN0120260012345)";
    }
  }

  if (step === 3) {
    if (!form.job_title) errors.job_title = "Job title is required";
    if (!form.employment_status)
      errors.employment_status = "Employment status is required";
  }

  if (step === 4) {
    if (!form.work_email?.trim()) errors.work_email = "Work email is required";
    else if (!EMAIL_PATTERN.test(form.work_email))
      errors.work_email = "Enter a valid email";

    const otherEmail = form.other_email?.trim() || "";
    if (otherEmail && !EMAIL_PATTERN.test(otherEmail))
      errors.other_email = "Enter a valid email";

    const mobile = form.mobile?.trim() || "";
    if (!mobile) errors.mobile = "Mobile is required";
    else if (!TEN_DIGIT_NUMBER_PATTERN.test(mobile))
      errors.mobile = "Mobile must be exactly 10 digits";

    const workTel = form.work_tel?.trim() || "";
    if (workTel && !TEN_DIGIT_NUMBER_PATTERN.test(workTel)) {
      errors.work_tel = "Work Tel must be exactly 10 digits";
    }

    const homeTel = form.home_tel?.trim() || "";
    if (homeTel && !TEN_DIGIT_NUMBER_PATTERN.test(homeTel)) {
      errors.home_tel = "Home Tel must be exactly 10 digits";
    }
  }

  if (
    step === 5 &&
    availableSupervisorsCount > 0 &&
    selectedSupervisors.length === 0
  ) {
    errors.supervisors = "Please assign at least one supervisor";
  }

  return errors;
}
