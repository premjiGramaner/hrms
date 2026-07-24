export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid username or password",
  ACCOUNT_DEACTIVATED: "This account has been deactivated",
  PASSWORD_EXPIRED:
    "Your password has expired after 40 days. A password reset link has been sent to your email.",
  PASSWORD_EXPIRING: (daysLeft) =>
    `Your password will expire in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Please change it soon.`,
  CREDENTIALS_REQUIRED: "Username and password are required",
  EMAIL_REQUIRED: "Email is required",
  EMAIL_SENT: "If the email exists, a password reset link has been sent.",
  TOKEN_INVALID: "Password link is invalid or expired.",
  PASSWORD_UPDATED: "Password updated successfully.",
  LOGOUT_SUCCESS: "Logged out successfully",
  UNAUTHORIZED: "Unauthorized",
  USER_NOT_FOUND: "User not found",
};

export const PASSWORD_POLICY_MESSAGES = {
  MIN_LENGTH: "Password must be at least 8 characters.",
  REQUIRE_LOWERCASE: "Password must include a lowercase letter.",
  REQUIRE_UPPERCASE: "Password must include an uppercase letter.",
  REQUIRE_NUMBER: "Password must include a number.",
  REQUIRE_SPECIAL: "Password must include a special character.",
  MISMATCH: "Password and confirm password must match.",
  REQUIRED: "New password and confirm password are required.",
};

export const PASSWORD_CONFIG = {
  EXPIRY_DAYS: 40,
  EXPIRY_MINUTES: 2,
  WARNING_DAYS: 37,
  WARNING_MINUTES: 1,
  MAX_REMINDERS: 3,
  REMINDER_INTERVAL_DAYS: 1,
  REMINDER_INTERVAL_MINUTES: 1,
  RESET_TOKEN_EXPIRY_HOURS: 1,
  MIN_LENGTH: 8,
  USE_MINUTES_FOR_TESTING: false,
};
