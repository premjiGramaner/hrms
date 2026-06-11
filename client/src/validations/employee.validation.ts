const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmployeeFormValues = Record<string, string>;

export function validateEmployeeStep(
  step: number,
  form: EmployeeFormValues,
  selectedSupervisors: number[],
  availableSupervisorsCount = 0,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 1) {
    if (!form.first_name?.trim()) errors.first_name = "First name is required";
    if (!form.last_name?.trim()) errors.last_name = "Last name is required";
    if (!form.joined_date) errors.joined_date = "Joined date is required";
    if (!form.location) errors.location = "Location is required";
  }

  if (step === 2 && !form.gender) {
    errors.gender = "Gender is required";
  }

  if (step === 3) {
    if (!form.job_title) errors.job_title = "Job title is required";
    if (!form.employment_status)
      errors.employment_status = "Employment status is required";
  }

  if (step === 4) {
    if (!form.work_email?.trim()) errors.work_email = "Work email is required";
    else if (!EMAIL_REGEX.test(form.work_email))
      errors.work_email = "Enter a valid email";
    if (!form.mobile?.trim()) errors.mobile = "Mobile number is required";
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
