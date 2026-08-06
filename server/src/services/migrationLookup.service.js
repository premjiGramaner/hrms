import { normalizeName } from "./migrationMapping.service.js";

const EMPLOYEE_CONTEXT_FIELDS = [
  ["job_title_reference", "job_title", "Job Title"],
  ["sub_unit_reference", "sub_unit", "Sub Unit"],
  ["location_reference", "location", "Location"],
];

function addCandidate(map, value, record) {
  const key = normalizeName(value);
  if (!key) return;
  if (!map.has(key)) map.set(key, new Map());
  map.get(key).set(String(record.id), record);
}

function candidatesFor(map, value) {
  return [...(map.get(normalizeName(value))?.values() || [])];
}

function resolveUnique(map, value, label) {
  const matches = candidatesFor(map, value);
  if (!matches.length) return { error: `${label} '${value}' was not found` };
  if (matches.length > 1) return { error: `${label} '${value}' is ambiguous` };
  return { record: matches[0] };
}

export class MigrationLookupService {
  constructor(data) {
    this.employeeByReference = new Map();
    this.leaveTypeByReference = new Map();
    this.jobTitles = new Set(data.jobTitles.map((row) => normalizeName(row.title)));
    this.subUnits = new Set(data.subUnits.map((row) => normalizeName(row.sub_unit_name)));
    this.locations = new Set(data.locations.map((row) => normalizeName(row.location)));

    for (const employee of data.employees) {
      const compositeName = [employee.first_name, employee.middle_name, employee.last_name]
        .filter((part) => part && !/^-+$/.test(String(part).trim()))
        .join(" ");
      addCandidate(this.employeeByReference, employee.name, employee);
      addCandidate(this.employeeByReference, employee.username, employee);
      addCandidate(this.employeeByReference, compositeName, employee);
    }
    for (const leaveType of data.leaveTypes) {
      addCandidate(this.leaveTypeByReference, leaveType.name, leaveType);
      addCandidate(this.leaveTypeByReference, leaveType.code, leaveType);
    }
  }

  static async load(pool) {
    const [employees, leaveTypes, jobTitles, subUnits, locations] = await Promise.all([
      pool.query(`SELECT id, name, username, first_name, middle_name, last_name,
                         job_title, sub_unit, location
                  FROM tbl_appusers`),
      pool.query(`SELECT id, name, code FROM tbl_leave_types WHERE is_deleted=FALSE AND is_active=TRUE`),
      pool.query(`SELECT id, title FROM tbl_job_titles WHERE is_active=TRUE`),
      pool.query(`SELECT id, sub_unit_name FROM tbl_sub_units WHERE is_active=TRUE`),
      pool.query(`SELECT DISTINCT location FROM tbl_appusers WHERE NULLIF(TRIM(location), '') IS NOT NULL`),
    ]);
    return new MigrationLookupService({
      employees: employees.rows,
      leaveTypes: leaveTypes.rows,
      jobTitles: jobTitles.rows,
      subUnits: subUnits.rows,
      locations: locations.rows,
    });
  }

  resolveEmployee(value, context = {}) {
    let matches = candidatesFor(this.employeeByReference, value);
    if (!matches.length) return { error: `Employee '${value}' was not found` };

    const contextFields = EMPLOYEE_CONTEXT_FIELDS.filter(
      ([sourceField]) => normalizeName(context[sourceField]),
    );
    if (matches.length > 1 && contextFields.length) {
      matches = matches.filter((employee) => contextFields.every(
        ([sourceField, employeeField]) =>
          normalizeName(employee[employeeField]) === normalizeName(context[sourceField]),
      ));
    }

    if (!matches.length) {
      const labels = contextFields.map(([, , label]) => label).join(", ");
      return { error: `Employee '${value}' does not match the supplied ${labels}` };
    }
    if (matches.length > 1) return { error: `Employee '${value}' is ambiguous` };
    return { record: matches[0] };
  }

  resolveLeaveType(value) {
    return resolveUnique(this.leaveTypeByReference, value, "Leave type");
  }

  hasJobTitle(value) {
    return this.jobTitles.has(normalizeName(value));
  }

  hasSubUnit(value) {
    return this.subUnits.has(normalizeName(value));
  }

  hasLocation(value) {
    return this.locations.has(normalizeName(value));
  }
}
