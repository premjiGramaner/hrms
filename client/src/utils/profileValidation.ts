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

  const nameRegex = /^[a-zA-Z\s]+$/;
  const alphaNumericRegex = /^[a-zA-Z0-9]+$/;

  const firstName = form.first_name.trim();
  const middleName = form.middle_name.trim();
  const lastName = form.last_name.trim();
  const nationality = form.nationality.trim();
  const licenseNumber = form.license_number.trim();

  if (!firstName) {
    errors.first_name = "First Name is required.";
  } else if (!nameRegex.test(firstName)) {
    errors.first_name = "First Name can only contain letters.";
  }

  if (middleName && !nameRegex.test(middleName)) {
    errors.middle_name = "Middle Name can only contain letters.";
  }

  if (!lastName) {
    errors.last_name = "Last Name is required.";
  } else if (!nameRegex.test(lastName)) {
    errors.last_name = "Last Name can only contain letters.";
  }

  if (!nationality) {
    errors.nationality = "Nationality is required.";
  }

  if (licenseNumber) {
    if (!alphaNumericRegex.test(licenseNumber)) {
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

  const phoneRegex = /^\d{10}$/;

  const mobile = form.mobile.trim();
  const workTel = form.work_tel.trim();
  const homeTel = form.home_tel.trim();

  if (!mobile) {
    errors.mobile = "Mobile number is required.";
  } else if (!phoneRegex.test(mobile)) {
    errors.mobile = "Mobile number must be exactly 10 digits.";
  }

  if (workTel && !phoneRegex.test(workTel)) {
    errors.work_tel = "Work Telephone must be exactly 10 digits.";
  }

  if (homeTel && !phoneRegex.test(homeTel)) {
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
