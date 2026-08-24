export const ERROR_MESSAGES = {
  GENERIC_ERROR: "An error occurred. Please try again.",
  NETWORK_ERROR: "Network error. Please check your connection.",
  UNAUTHORIZED: "You are not authorized to perform this action.",

  LOAD_FAILED: (resource: string) =>
    `Failed to load ${resource}. Please refresh.`,
  LOAD_USERS_FAILED: "Failed to load users. Please refresh the page.",
  LOAD_EMPLOYEES_FAILED: "Failed to load employees. Please refresh.",
  LOAD_JOB_TITLES_FAILED: "Failed to load job titles.",
  LOAD_JOB_CATEGORIES_FAILED: "Failed to load job categories.",
  LOAD_SUB_UNITS_FAILED: "Failed to load sub units.",
  LOAD_SUPERVISORS_FAILED: "Failed to load supervisors.",
  LOAD_LOCATIONS_FAILED: "Failed to load locations.",
  LOAD_ROLE_ACCESS_FAILED: "Failed to load users. Please refresh.",

  SAVE_FAILED: (action: string, resource: string) =>
    `Failed to ${action} ${resource}. Please try again.`,
  CREATE_FAILED: (resource: string) => `Failed to create ${resource}.`,
  UPDATE_FAILED: (resource: string) => `Failed to update ${resource}.`,
  DELETE_FAILED: (resource: string) =>
    `Failed to delete ${resource}. Please try again.`,
  EXPORT_FAILED: "Failed to export report. Please try again.",

  REQUIRED_FIELD: (field: string) => `${field} is required.`,
  INVALID_EMAIL: "A valid email address is required.",
  INVALID_FORMAT: (field: string) => `Invalid ${field} format.`,

  RATINGS_SUBMITTED:
    "Cannot edit cycle. Ratings have already been submitted by supervisors or employees.",
  CYCLE_UPDATE_FAILED: "Unable to update cycle.",
} as const;

export const SUCCESS_MESSAGES = {
  CREATED: (resource: string) => `${resource} created successfully.`,
  UPDATED: (resource: string) => `${resource} updated successfully.`,
  DELETED: (resource: string) => `${resource} deleted successfully.`,
  SAVED: "Changes saved successfully.",
  PROFILE_UPDATED: "Profile updated successfully",

  CYCLE_UPDATED: "Cycle updated successfully.",
} as const;

export const CONFIRMATION_MESSAGES = {
  DELETE_CONFIRM: (resource: string, name: string) => ({
    title: `Delete ${resource}`,
    message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
  }),
  ROLE_CHANGE_CONFIRM: (
    userName: string,
    fromRole: string,
    toRole: string,
  ) => ({
    title: "Change User Role",
    message: `Are you sure you want to change ${userName}'s role from ${fromRole} to ${toRole}?`,
  }),
} as const;

export const PLACEHOLDER_TEXT = {
  SEARCH_GENERAL: "Search...",
  SEARCH_BY_NAME: "Search by name...",
  SEARCH_BY_NAME_EMAIL: "Search by name or email...",
  SEARCH_BY_NAME_USERNAME_EMAIL: "Search by name, username or email…",
  SEARCH_EMPLOYEES: "Search by name, ID, email, job title…",
  SEARCH_JOB_TITLES: "Search job titles or description…",
  SEARCH_JOB_CATEGORIES: "Search categories or description…",
  SEARCH_SUB_UNITS: "Search by name or supervisor…",
  NO_DESCRIPTION: "No description",
} as const;

export const EMPTY_STATE_MESSAGES = {
  NO_RESULTS: (query: string) => `No results for "${query}"`,
  NO_ITEMS: (resource: string) => `No ${resource} yet`,
  NO_ITEMS_FOUND: (resource: string) => `No ${resource} found`,
  TRY_DIFFERENT_SEARCH: "Try a different search term",
  ADD_TO_CREATE: (resource: string) => `Click 'Add ${resource}' to create one`,
} as const;
