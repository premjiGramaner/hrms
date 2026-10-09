import {
  hoursToRequestedDays,
  toPostgresDate,
  toPostgresTimestamp,
} from "../utils/migrationDateConverter.js";
import { normalizeName } from "./migrationMapping.service.js";

function issue(column, invalidValue, reason, code, suggestedFix) {
  return { column, invalidValue: invalidValue ?? "", reason, severity: "ERROR", code, suggestedFix };
}

function required(source, field, label, errors) {
  const value = source[field];
  if (value !== null && value !== undefined && String(value).trim() !== "") return true;
  errors.push(issue(field, value, `${label} is required`, "REQUIRED", `Provide ${label} in the source row.`));
  return false;
}

function validateEmployeeContext(employee, source, present, errors) {
  const fields = [
    ["job_title_reference", "job_title", "Job Title"],
    ["sub_unit_reference", "sub_unit", "Sub Unit"],
    ["location_reference", "location", "Location"],
  ];
  for (const [sourceField, employeeField, label] of fields) {
    if (!present[sourceField]) continue;
    if (normalizeName(employee[employeeField]) !== normalizeName(source[sourceField])) {
      errors.push(issue(
        sourceField,
        source[sourceField],
        `${label} does not match employee '${source.employee_reference}'`,
        `EMPLOYEE_${employeeField.toUpperCase()}_MISMATCH`,
        `Use the ${label} assigned to the employee in tbl_appusers.`,
      ));
    }
  }
}

export function validateLeaveMigrationRow(source, lookups, config) {
  const errors = [];
  const resolved = {};
  const requiredFields = [
    ["employee_reference", "Employee Name"],
    ["job_title_reference", "Job Title"],
    ["sub_unit_reference", "Sub Unit"],
    ["location_reference", "Location"],
    ["leave_type_reference", "Leave Type"],
    ["leave_date", "Leave Date"],
    ["requested_hours", "Leave Duration (Hours)"],
    ["applied_on", "Leave Applied On"],
  ];
  const present = Object.fromEntries(requiredFields.map(([field, label]) => [field, required(source, field, label, errors)]));

  if (present.employee_reference) {
    const result = lookups.resolveEmployee(source.employee_reference, source);
    if (result.error) {
      errors.push(issue("employee_reference", source.employee_reference, result.error, "EMPLOYEE_LOOKUP", "Correct Employee Name, Job Title, Sub Unit, or Location so one tbl_appusers record matches."));
    } else {
      resolved.employee = result.record;
      validateEmployeeContext(result.record, source, present, errors);
    }
  }
  if (present.leave_type_reference) {
    const result = lookups.resolveLeaveType(source.leave_type_reference);
    if (result.error) errors.push(issue("leave_type_reference", source.leave_type_reference, result.error, "LEAVE_TYPE_LOOKUP", "Use an active leave type name configured in tbl_leave_types."));
    else resolved.leaveType = result.record;
  }
  if (present.job_title_reference && !lookups.hasJobTitle(source.job_title_reference)) {
    errors.push(issue("job_title_reference", source.job_title_reference, "Job title was not found", "JOB_TITLE_LOOKUP", "Use an active title from tbl_job_titles; the migration does not create it."));
  }
  if (present.sub_unit_reference && !lookups.hasSubUnit(source.sub_unit_reference)) {
    errors.push(issue("sub_unit_reference", source.sub_unit_reference, "Sub unit was not found", "SUB_UNIT_LOOKUP", "Use an active sub unit from tbl_sub_units; the migration does not create it."));
  }
  if (present.location_reference && !lookups.hasLocation(source.location_reference)) {
    errors.push(issue("location_reference", source.location_reference, "Location was not found", "LOCATION_LOOKUP", "Use a location assigned to an employee in the HRMS."));
  }

  if (present.leave_date && !toPostgresDate(source.leave_date, config.dateOrder)) {
    errors.push(issue("leave_date", source.leave_date, "Invalid leave date", "DATE", "Use a valid Excel date or configured date format."));
  }
  if (present.applied_on && !toPostgresTimestamp(source.applied_on, config.dateOrder)) {
    errors.push(issue("applied_on", source.applied_on, "Invalid leave applied timestamp", "TIMESTAMP", "Use a valid Excel date/time or configured date format."));
  }
  const requestedDays = present.requested_hours
    ? hoursToRequestedDays(
      source.requested_hours,
      config.hoursPerDay,
      config.requestedDaysPrecision,
    )
    : undefined;
  if (present.requested_hours && (requestedDays === undefined || requestedDays <= 0)) {
    errors.push(issue(
      "requested_hours",
      source.requested_hours,
      "Leave duration must convert to a positive requested-day value",
      "HOURS",
      `Provide enough hours to round above zero at ${config.requestedDaysPrecision} decimal place(s).`,
    ));
  }

  return { valid: errors.length === 0, errors, resolved };
}
