import { EditableEmployeeProfileForm } from "../types/employeeProfile";

export interface ValidationErrors {
  [key: string]: string;
}

export const validatePersonalDetails = (
  form: EditableEmployeeProfileForm,
  isAdmin: boolean
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // First Name - Required, Characters only
  if (!form.first_name.trim()) {
    errors.first_name = "First Name is required.";
  } else if (!/^[a-zA-Z\s]+$/.test(form.first_name)) {
    errors.first_name = "First Name can only contain letters.";
  }

  // Middle Name - Optional, Characters only if provided
  if (form.middle_name && !/^[a-zA-Z\s]+$/.test(form.middle_name)) {
    errors.middle_name = "Middle Name can only contain letters.";
  }

  // Last Name - Required, Characters only
  if (!form.last_name.trim()) {
    errors.last_name = "Last Name is required.";
  } else if (!/^[a-zA-Z\s]+$/.test(form.last_name)) {
    errors.last_name = "Last Name can only contain letters.";
  }

  // Nationality - Required
  if (!form.nationality || form.nationality.trim() === "") {
    errors.nationality = "Nationality is required.";
  }

  // Blood Group - Must be selected from dropdown (optional validation)
  // Since it's dropdown, no custom validation needed unless required

  // License Number - Alphanumeric, 15-16 characters
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
  form: EditableEmployeeProfileForm
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Mobile - Required, exactly 10 digits
  if (!form.mobile.trim()) {
    errors.mobile = "Mobile number is required.";
  } else if (!/^\d{10}$/.test(form.mobile)) {
    errors.mobile = "Mobile number must be exactly 10 digits.";
  }

  // Work Telephone - Optional, exactly 10 digits if provided
  if (form.work_tel && !/^\d{10}$/.test(form.work_tel)) {
    errors.work_tel = "Work Telephone must be exactly 10 digits.";
  }

  // Home Telephone - Optional, exactly 10 digits if provided
  if (form.home_tel && !/^\d{10}$/.test(form.home_tel)) {
    errors.home_tel = "Home Telephone must be exactly 10 digits.";
  }

  return errors;
};

export const validateEmploymentDetails = (
  form: EditableEmployeeProfileForm
): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Job Title - Required
  if (!form.job_title || form.job_title.trim() === "") {
    errors.job_title = "Job Title is required.";
  }

  // Sub Unit - Required
  if (!form.sub_unit || form.sub_unit.trim() === "") {
    errors.sub_unit = "Sub Unit is required.";
  }

  // Location - Required
  if (!form.location || form.location.trim() === "") {
    errors.location = "Location is required.";
  }

  return errors;
};

export const validateAllSections = (
  form: EditableEmployeeProfileForm,
  isAdmin: boolean
): ValidationErrors => {
  return {
    ...validatePersonalDetails(form, isAdmin),
    ...validateContactDetails(form),
    ...validateEmploymentDetails(form),
  };
};

// Helper to check if form has any errors
export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

// Helper to filter out errors for disabled fields (employees can't edit these)
export const filterErrorsForRole = (
  errors: ValidationErrors,
  isAdmin: boolean
): ValidationErrors => {
  if (isAdmin) return errors;

  // Remove errors for fields that employees can't edit
  const { employee_id, real_dob, ...employeeEditableErrors } = errors;
  return employeeEditableErrors;
};
