export const VALIDATION_PATTERNS = {
  PHONE: /^\d{10}$/,
  LICENSE_NUMBER: /^[A-Z0-9]{15,16}$/,
  EMPLOYEE_ID: /^[A-Z0-9-]+$/i,
} as const;

export const FIELD_LENGTHS = {
  LICENSE_NUMBER_MIN: 15,
  LICENSE_NUMBER_MAX: 16,
  PHONE_LENGTH: 10,
  PASSWORD_MIN: 8,
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,
} as const;

export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Please enter a valid email address",
  PHONE_INVALID: "Phone number must be exactly 10 digits",
  LICENSE_INVALID: "License number must be 15-16 characters",
  FIELD_REQUIRED: "This field is required",
  PASSWORD_MIN_LENGTH: `Password must be at least ${FIELD_LENGTHS.PASSWORD_MIN} characters`,
} as const;
