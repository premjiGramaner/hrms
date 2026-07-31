import {
  hoursToRequestedDays,
  toPostgresDate,
  toPostgresTimestamp,
} from "../utils/migrationDateConverter.js";

export function mapLeaveRequest(source, resolved, config) {
  const leaveDate = toPostgresDate(source.leave_date, config.dateOrder);
  const requestedDays = hoursToRequestedDays(
    source.requested_hours,
    config.hoursPerDay,
    config.requestedDaysPrecision,
  );
  return {
    employee_id: resolved.employee.id,
    leave_type_id: resolved.leaveType.id,
    start_date: leaveDate,
    end_date: leaveDate,
    requested_days: requestedDays,
    applied_on: source.applied_on
      ? toPostgresTimestamp(source.applied_on, config.dateOrder)
      : null,
    ...config.defaults,
  };
}
