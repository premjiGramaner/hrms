export function getLeaveMigrationConfig() {
  const configuredHoursPerDay = Number(process.env.LEAVE_MIGRATION_HOURS_PER_DAY);
  if (!Number.isFinite(configuredHoursPerDay) || configuredHoursPerDay <= 0) {
    throw new Error(
      "LEAVE_MIGRATION_HOURS_PER_DAY must be configured as a positive number",
    );
  }
  return Object.freeze({
    hoursPerDay: configuredHoursPerDay,
    requestedDaysPrecision: 1,
    dateOrder: String(process.env.LEAVE_MIGRATION_DATE_ORDER || "DMY").toUpperCase(),
    defaults: Object.freeze({
      reason: null,
      status: "Approved",
      approved_by: null,
      approved_on: null,
      rejection_reason: null,
      attachment_status: "Not Required",
      comments: null,
    }),
  });
}
