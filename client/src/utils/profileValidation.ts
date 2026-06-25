import { EditableEmployeeProfileForm } from "../types/employeeProfile";

export interface ValidationErrors {
  [key: string]: string;
}
const NON_EMPTY_REGEX = /\S/;
const isEmpty = (value?: string | null): boolean =>
  !NON_EMPTY_REGEX.test(value ?? "");

export const validatePersonalDetails = (
  form: EditableEmployeeProfileForm,
  isAdmin: boolean,
): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!form.first_name.trim()) {
    errors.first_name = "First Name is required.";
  } else if (!/^[a-zA-Z\s]+$/.test(form.first_name)) {
    errors.first_name = "First Name can only contain letters.";
  }
  if (form.middle_name && !/^[a-zA-Z\s]+$/.test(form.middle_name)) {
    errors.middle_name = "Middle Name can only contain letters.";
  }
  if (!form.last_name.trim()) {
    errors.last_name = "Last Name is required.";
  } else if (!/^[a-zA-Z\s]+$/.test(form.last_name)) {
    errors.last_name = "Last Name can only contain letters.";
  }
  if (!form.nationality || form.nationality.trim() === "") {
    errors.nationality = "Nationality is required.";
  }
  if (form.license_number) {
    const licenseNumber = form.license_number.trim();
    if (!/^[a-zA-Z0-9]+$/.test(licenseNumber)) {
      errors.license_number = "Please enter a valid License Number.";
    } else if (licenseNumber.length < 15 || licenseNumber.length > 16) {
      errors.license_number = "Please enter a valid License Number.";
    }
  }

  return errors;
};

export const validateContactDetails = (
  form: EditableEmployeeProfileForm,
): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!form.mobile.trim()) {
    errors.mobile = "Mobile number is required.";
  } else if (!/^\d{10}$/.test(form.mobile)) {
    errors.mobile = "Mobile number must be exactly 10 digits.";
  }
  if (form.work_tel && !/^\d{10}$/.test(form.work_tel)) {
    errors.work_tel = "Work Telephone must be exactly 10 digits.";
  }
  if (form.home_tel && !/^\d{10}$/.test(form.home_tel)) {
    errors.home_tel = "Home Telephone must be exactly 10 digits.";
  }

  return errors;
};

export const validateEmploymentDetails = (
  form: EditableEmployeeProfileForm,
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (isEmpty(form.job_title)) {
    errors.job_title = "Job Title is required.";
  }

  if (isEmpty(form.sub_unit)) {
    errors.sub_unit = "Sub Unit is required.";
  }

  if (isEmpty(form.location)) {
    errors.location = "Location is required.";
  }

  return errors;
};

export const validateAllSections = (
  form: EditableEmployeeProfileForm,
  isAdmin: boolean,
): ValidationErrors => {
  return {
    ...validatePersonalDetails(form, isAdmin),
    ...validateContactDetails(form),
    ...validateEmploymentDetails(form),
  };
};
export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};
export const filterErrorsForRole = (
  errors: ValidationErrors,
  isAdmin: boolean,
): ValidationErrors => {
  if (isAdmin) return errors;
  const { employee_id, real_dob, ...employeeEditableErrors } = errors;
  return employeeEditableErrors;
};
