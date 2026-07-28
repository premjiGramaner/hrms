import pool from "../config/db.js";

const EMPLOYEE_SCOPES = new Set(["current", "past", "all"]);

function buildReportFilters(filterCriteria) {
  const {
    employeeScope,
    year,
    status,
    department,
    leaveTypeId,
    location,
    employeeName,
  } = filterCriteria;
  const conditions = ["lr.is_deleted = false"];
  const values = [];
  const addValue = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  const normalizedScope = EMPLOYEE_SCOPES.has(employeeScope)
    ? employeeScope
    : "current";
  if (normalizedScope === "current") {
    conditions.push(
      `u.is_deleted = false
       AND u.is_active = true
       AND (u.employment_status IS NULL OR u.employment_status != 'Terminated')`,
    );
  } else if (normalizedScope === "past") {
    conditions.push(
      `(u.is_deleted = true
        OR u.is_active = false
        OR u.employment_status = 'Terminated')`,
    );
  }

  if (year) {
    const yearParameter = addValue(Number(year));
    conditions.push(
      `(lr.start_date <= MAKE_DATE(${yearParameter}::int, 12, 31)
        AND lr.end_date >= MAKE_DATE(${yearParameter}::int, 1, 1))`,
    );
  }
  if (status) conditions.push(`lr.status = ${addValue(status)}`);
  if (department) conditions.push(`u.sub_unit = ${addValue(department)}`);
  if (leaveTypeId) {
    conditions.push(`lr.leave_type_id = ${addValue(leaveTypeId)}::bigint`);
  }
  if (location) conditions.push(`u.location = ${addValue(location)}`);
  if (employeeName) {
    const employeeSearchParameter = addValue(`%${employeeName}%`);
    conditions.push(
      `(u.name ILIKE ${employeeSearchParameter}
        OR u.employee_id ILIKE ${employeeSearchParameter}
        OR u.username ILIKE ${employeeSearchParameter})`,
    );
  }

  return {
    whereClause: conditions.join(" AND "),
    values,
  };
}

function normalizeSummary(summaryRow, departmentRows) {
  return {
    totalRecords: Number(summaryRow.total_records || 0),
    totalDays: Number(summaryRow.total_days || 0),
    totalEmployees: Number(summaryRow.total_employees || 0),
    totalDepartments: Number(summaryRow.total_departments || 0),
    departmentTotals: departmentRows.map((departmentRow) => ({
      department: departmentRow.department,
      totalDays: Number(departmentRow.total_days || 0),
      leaveCount: Number(departmentRow.leave_count || 0),
      employeeCount: Number(departmentRow.employee_count || 0),
    })),
  };
}

async function getLeaveByDepartmentReport(filterCriteria) {
  const page = Math.max(1, Number(filterCriteria.page) || 1);
  const limit = Math.max(1, Number(filterCriteria.limit) || 15);
  const offset = (page - 1) * limit;
  const { whereClause, values } = buildReportFilters(filterCriteria);

  const baseJoins = `
    FROM tbl_leave_requests lr
    INNER JOIN tbl_appusers u ON u.id = lr.employee_id
    INNER JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id
    WHERE ${whereClause}`;

  const employeePageResult = await pool.query(
    `SELECT lr.employee_id, MAX(lr.start_date) AS latest_leave_date
     ${baseJoins}
     GROUP BY lr.employee_id
     ORDER BY latest_leave_date DESC, lr.employee_id
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );
  const employeeIds = employeePageResult.rows.map((row) => row.employee_id);
  const employeeIdsParameter = `$${values.length + 1}`;

  const [dataResult, summaryResult, departmentResult] = await Promise.all([
    pool.query(
      `SELECT
         lr.id::int,
         u.id::int AS user_id,
         COALESCE(u.employee_id, '') AS employee_id,
         COALESCE(NULLIF(TRIM(u.name), ''), u.username, 'Unknown Employee')
           AS employee_name,
         COALESCE(NULLIF(TRIM(u.sub_unit), ''), 'Unassigned') AS department,
         COALESCE(u.location, '') AS location,
         lr.start_date::text,
         lr.end_date::text,
         lt.name AS leave_type,
         ROUND(COALESCE(lr.requested_days, 0)::numeric, 2) AS leave_days,
         ROUND((COALESCE(lr.requested_days, 0) * 8)::numeric, 2)
           AS leave_hours,
         lr.status,
         CASE
           WHEN u.is_deleted = true
             OR u.is_active = false
             OR u.employment_status = 'Terminated'
             THEN 'Past Employee'
           ELSE 'Current Employee'
       END AS employee_scope
       ${baseJoins}
       AND lr.employee_id = ANY(${employeeIdsParameter}::bigint[])
       ORDER BY
         array_position(${employeeIdsParameter}::bigint[], lr.employee_id),
         lr.start_date ASC,
         lr.id ASC`,
      [...values, employeeIds],
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS total_records,
         COALESCE(SUM(lr.requested_days), 0) AS total_days,
         COUNT(DISTINCT lr.employee_id)::int AS total_employees,
         COUNT(
           DISTINCT COALESCE(NULLIF(TRIM(u.sub_unit), ''), 'Unassigned')
         )::int AS total_departments
       ${baseJoins}`,
      values,
    ),
    pool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(u.sub_unit), ''), 'Unassigned') AS department,
         COALESCE(SUM(lr.requested_days), 0) AS total_days,
         COUNT(*)::int AS leave_count,
         COUNT(DISTINCT lr.employee_id)::int AS employee_count
       ${baseJoins}
       GROUP BY COALESCE(NULLIF(TRIM(u.sub_unit), ''), 'Unassigned')
       ORDER BY total_days DESC, department ASC`,
      values,
    ),
  ]);

  const summary = normalizeSummary(
    summaryResult.rows[0] || {},
    departmentResult.rows,
  );

  return {
    reportData: dataResult.rows.map((reportRow) => ({
      ...reportRow,
      leave_days: Number(reportRow.leave_days || 0),
      leave_hours: Number(reportRow.leave_hours || 0),
    })),
    summary,
    totalRecords: summary.totalEmployees,
    totalPages: Math.max(1, Math.ceil(summary.totalEmployees / limit)),
    currentPage: page,
  };
}

async function getLeaveByDepartmentFilterOptions() {
  const [
    yearResult,
    departmentResult,
    statusResult,
    typeResult,
    locationResult,
  ] = await Promise.all([
    pool.query(
      `SELECT DISTINCT EXTRACT(YEAR FROM start_date)::int AS year
         FROM tbl_leave_requests
         WHERE is_deleted = false
         ORDER BY year DESC`,
    ),
    pool.query(
      `SELECT DISTINCT sub_unit AS department
         FROM tbl_appusers
         WHERE sub_unit IS NOT NULL AND TRIM(sub_unit) != ''
         ORDER BY department`,
    ),
    pool.query(
      `SELECT DISTINCT status
         FROM tbl_leave_requests
         WHERE is_deleted = false AND status IS NOT NULL
         ORDER BY status`,
    ),
    pool.query(
      `SELECT id::int, name
         FROM tbl_leave_types
         WHERE is_deleted = false
         ORDER BY name`,
    ),
    pool.query(
      `SELECT DISTINCT location
         FROM tbl_appusers
         WHERE location IS NOT NULL AND TRIM(location) != ''
         ORDER BY location`,
    ),
  ]);

  return {
    years: yearResult.rows.map((row) => row.year),
    departments: departmentResult.rows.map((row) => row.department),
    statuses: statusResult.rows.map((row) => row.status),
    leaveTypes: typeResult.rows,
    locations: locationResult.rows.map((row) => row.location),
  };
}

export { getLeaveByDepartmentFilterOptions, getLeaveByDepartmentReport };
