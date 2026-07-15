export const successMessage = (
  message,
  count = null,
  countLabel = "recipient(s)",
) => {
  if (count !== null && count !== undefined) {
    return {
      success: true,
      message: `${message} to ${count} ${countLabel}`,
    };
  }
  return {
    success: true,
    message,
  };
};

export const errorMessage = (message, error = null) => {
  return {
    success: false,
    message: error ? error.message || message : message,
  };
};

export const successWithData = (message, data = {}) => {
  return {
    success: true,
    message,
    ...data,
  };
};

export const errorWithData = (message, data = {}) => {
  return {
    success: false,
    message,
    ...data,
  };
};

export const notificationMessages = {
  emailSent: (type, count) =>
    successMessage(
      `${type} alert email sent successfully`,
      count,
      "recipient(s)",
    ),

  noItems: (type) => successMessage(`No ${type.toLowerCase()} to notify`),

  disabled: (type) => errorMessage(`${type} notifications disabled`),

  noRecipients: () => errorMessage("No recipient emails configured"),

  sendFailed: (error) =>
    errorMessage("Failed to send notification email", error),

  processingFailed: (type, error) =>
    errorMessage(
      `Failed to process ${type.toLowerCase()} notifications`,
      error,
    ),
};

export const employeeMessages = {
  created: (emailSent = true) =>
    successWithData("Employee created successfully", {
      emailSent,
      emailMessage: emailSent
        ? "Welcome email sent successfully"
        : "Employee created, but welcome email could not be sent. Check SMTP configuration.",
    }),

  updated: () => successMessage("Employee updated successfully"),

  deleted: () => successMessage("Employee deleted successfully"),

  terminated: () => successMessage("Employee terminated successfully"),

  notFound: () => errorMessage("Employee not found"),

  emailExists: () => errorMessage("An employee with this email already exists"),

  idExists: () => errorMessage("Employee ID already exists"),
};

export const leaveMessages = {
  applied: () => successMessage("Leave application submitted successfully"),

  approved: (employeeName) =>
    successMessage(`Leave request for ${employeeName} approved successfully`),

  rejected: (employeeName) =>
    successMessage(`Leave request for ${employeeName} rejected successfully`),

  cancelled: () => successMessage("Leave request cancelled successfully"),

  notFound: () => errorMessage("Leave request not found"),

  insufficientBalance: (available, requested) =>
    errorMessage(
      `Insufficient leave balance. Available: ${available} days, Requested: ${requested} days`,
    ),

  overlapping: () =>
    errorMessage("Leave request overlaps with an existing leave"),

  unauthorized: () =>
    errorMessage("You are not authorized to perform this action"),
};

export const reportMessages = {
  generated: (type, count) =>
    successMessage(`${type} report generated successfully`, count, "record(s)"),

  exported: (type, format) =>
    successMessage(`${type} report exported to ${format} successfully`),

  noData: (type) =>
    successWithData(`No ${type.toLowerCase()} data found`, {
      count: 0,
      data: [],
    }),

  configSaved: (type) =>
    successMessage(`${type} notification configuration saved successfully`),

  configFailed: (type) =>
    errorMessage(`Failed to save ${type} notification configuration`),
};

export const authMessages = {
  loginSuccess: () => successMessage("Login successful"),

  loginFailed: () => errorMessage("Invalid email or password"),

  logoutSuccess: () => successMessage("Logout successful"),

  passwordChanged: () => successMessage("Password changed successfully"),

  passwordResetSent: () =>
    successMessage("Password reset link sent to your email"),

  tokenExpired: () =>
    errorMessage("Reset token has expired. Please request a new one"),

  tokenInvalid: () => errorMessage("Invalid or expired reset token"),

  unauthorized: () => errorMessage("Unauthorized access. Please login again"),

  accountInactive: () =>
    errorMessage("Your account is inactive. Please contact HR"),
};

export const genericMessages = {
  success: (action) => successMessage(`${action} completed successfully`),

  failed: (action, error = null) =>
    errorMessage(`Failed to ${action.toLowerCase()}`, error),

  notFound: (entity) => errorMessage(`${entity} not found`),

  alreadyExists: (entity) => errorMessage(`${entity} already exists`),

  validationFailed: (field) => errorMessage(`Invalid ${field.toLowerCase()}`),

  noPermission: () =>
    errorMessage("You do not have permission to perform this action"),

  serverError: () =>
    errorMessage("An unexpected error occurred. Please try again later"),
};

export default {
  successMessage,
  errorMessage,
  successWithData,
  errorWithData,
  notificationMessages,
  employeeMessages,
  leaveMessages,
  reportMessages,
  authMessages,
  genericMessages,
};
