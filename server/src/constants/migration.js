export const MIGRATION_STATUS = Object.freeze({
  VALIDATING: "VALIDATING",
  READY: "READY",
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  COMPLETED_WITH_ERRORS: "COMPLETED_WITH_ERRORS",
  FAILED: "FAILED",
});

export const ROW_STATUS = Object.freeze({
  VALID: "VALID",
  WARNING: "WARNING",
  INVALID: "INVALID",
  INSERTED: "INSERTED",
  UPDATED: "UPDATED",
  SKIPPED: "SKIPPED",
  FAILED: "FAILED",
});

export const MIGRATION_LIMITS = Object.freeze({
  MAX_FILE_SIZE: 25 * 1024 * 1024,
  MAX_SHEETS: 50,
  MAX_ROWS: 50000,
  PREVIEW_ROWS: 10,
  BATCH_SIZE: 25,
  PROGRESS_INTERVAL: 10,
});

export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
