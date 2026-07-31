import { logError, logInfo, logWarn } from "./logger.js";

export function logLeaveRow({ migrationId, row, employee, leaveType, status, errors = [], executionTimeMs }) {
  const meta = {
    migrationId,
    sheet: row.sheet_name,
    excelRow: row.source_row,
    employee,
    leaveType,
    status,
    validationErrors: errors,
    executionTimeMs,
  };
  if (status === "FAILED") return logError("Leave migration row failed", errors.join("; "), meta);
  if (status === "SKIPPED") return logWarn("Leave migration row skipped", meta);
  return logInfo("Leave migration row inserted", meta);
}
