import pool from '../config/db.js';

/**
 * Termination Report Query
 * Retrieves terminated employees from the termination history table
 * Uses tbl_employee_terminations for real-time termination tracking
 */
async function getTerminationReportData(filterCriteria, paginationOptions) {
  const { dateFrom, dateTo, groupCompany, location, employeeId, employeeName, page, limit, sortColumn, sortDirection } = filterCriteria;
  
  const offset = (page - 1) * limit;
  const conditions = ['t.is_deleted = FALSE'];
  const values = [];
  let valueIndex = 1;

  if (dateFrom) {
    conditions.push(`t.termination_date >= $${valueIndex}::date`);
    values.push(dateFrom);
    valueIndex++;
  }

  if (dateTo) {
    conditions.push(`t.termination_date <= $${valueIndex}::date`);
    values.push(dateTo);
    valueIndex++;
  }

  if (groupCompany) {
    conditions.push(`t.sub_unit ILIKE $${valueIndex}`);
    values.push(`%${groupCompany}%`);
    valueIndex++;
  }

  if (location) {
    conditions.push(`t.location ILIKE $${valueIndex}`);
    values.push(`%${location}%`);
    valueIndex++;
  }

  if (employeeId) {
    conditions.push(`t.employee_code ILIKE $${valueIndex}`);
    values.push(`%${employeeId}%`);
    valueIndex++;
  }

  if (employeeName) {
    conditions.push(`t.employee_name ILIKE $${valueIndex}`);
    values.push(`%${employeeName}%`);
    valueIndex++;
  }

  const whereClause = conditions.join(' AND ');
  
  // Validate sort column to prevent SQL injection
  const allowedSortColumns = ['employee_code', 'employee_name', 'job_title', 'sub_unit', 'location', 'date_of_joining', 'termination_date'];
  const safeSortColumn = allowedSortColumns.includes(sortColumn) ? sortColumn : 'termination_date';
  const safeSortDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countQuery = `
    SELECT COUNT(*)::int AS total_records
    FROM tbl_employee_terminations t
    WHERE ${whereClause}
  `;
  const { rows: countRows } = await pool.query(countQuery, values);
  const totalRecords = countRows[0].total_records;

  // Get paginated data from termination history table
  const dataQuery = `
    SELECT 
      t.id,
      t.employee_id,
      t.employee_code AS emp_id,
      t.employee_name,
      t.job_title AS designation,
      t.sub_unit AS group_company,
      t.location,
      t.date_of_joining::text,
      t.termination_date::text AS date_of_exit,
      t.last_working_day::text,
      t.termination_reason,
      t.termination_type,
      t.notice_period_days,
      t.exit_interview_completed,
      t.rehire_eligible,
      COALESCE(NULLIF(TRIM(t.termination_notes), ''), 'No additional notes') AS termination_notes,
      t.supervisor_names AS reporting_manager,
      COALESCE(t.terminated_by_name, 'System') AS terminated_by,
      t.created_at::text AS termination_created_at,
      t.updated_at::text AS termination_updated_at
    FROM tbl_employee_terminations t
    WHERE ${whereClause}
    ORDER BY t.${safeSortColumn} ${safeSortDirection}
    LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
  `;
  
  values.push(limit, offset);
  const { rows: dataRows } = await pool.query(dataQuery, values);

  return {
    reportData: dataRows,
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    currentPage: page,
  };
}

/**
 * Birthday Report Query
 * Retrieves employees with upcoming birthdays filtered by role access
 */
async function getBirthdayReportData(filterCriteria, userContext) {
  const { monthFilter, dateFrom, dateTo, employeeId, employeeName, genderFilter, maritalStatusFilter, roleFilter, page, limit, sortColumn, sortDirection } = filterCriteria;
  const { userId, userRole } = userContext;
  
  const offset = (page - 1) * limit;
  const conditions = ['u.is_deleted = FALSE', 'u.is_active = TRUE', 'u.real_dob IS NOT NULL'];
  const values = [];
  let valueIndex = 1;

  // Role-based access control
  if (userRole === 'employee') {
    // Employees can only see their own birthday
    conditions.push(`u.id = $${valueIndex}`);
    values.push(userId);
    valueIndex++;
  } else if (userRole === 'empmanager') {
    // Supervisors can see their subordinates + themselves
    conditions.push(`(u.id = $${valueIndex} OR $${valueIndex} = ANY(
      SELECT UNNEST(
        CASE 
          WHEN supervisors IS NULL OR TRIM(supervisors) = '' THEN ARRAY[]::bigint[]
          ELSE (
            SELECT ARRAY_AGG(NULLIF(TRIM(elem::text), '')::bigint)
            FROM jsonb_array_elements_text(supervisors::jsonb) AS elem
            WHERE TRIM(elem::text) ~ '^[0-9]+$'
          )
        END
      )
    ))`);
    values.push(userId);
    valueIndex++;
  }
  // hradmin can see all employees (no additional filter)

  // Month filter (e.g., "01" for January)
  if (monthFilter) {
    conditions.push(`EXTRACT(MONTH FROM u.real_dob) = $${valueIndex}::int`);
    values.push(parseInt(monthFilter, 10));
    valueIndex++;
  }

  // Date range filter for birthday month and day
  if (dateFrom && dateTo) {
    conditions.push(`TO_CHAR(u.real_dob, 'MM-DD') BETWEEN $${valueIndex} AND $${valueIndex + 1}`);
    values.push(dateFrom, dateTo);
    valueIndex += 2;
  }

  if (employeeId) {
    conditions.push(`u.employee_id ILIKE $${valueIndex}`);
    values.push(`%${employeeId}%`);
    valueIndex++;
  }

  if (employeeName) {
    conditions.push(`(u.name ILIKE $${valueIndex} OR u.first_name ILIKE $${valueIndex} OR u.last_name ILIKE $${valueIndex})`);
    values.push(`%${employeeName}%`);
    valueIndex++;
  }

  if (genderFilter) {
    conditions.push(`u.gender = $${valueIndex}`);
    values.push(genderFilter);
    valueIndex++;
  }

  if (maritalStatusFilter) {
    conditions.push(`u.marital_status = $${valueIndex}`);
    values.push(maritalStatusFilter);
    valueIndex++;
  }

  if (roleFilter) {
    conditions.push(`u.role = $${valueIndex}`);
    values.push(roleFilter);
    valueIndex++;
  }

  const whereClause = conditions.join(' AND ');
  
  // Validate sort column
  const allowedSortColumns = ['employee_id', 'first_name', 'last_name', 'name', 'real_dob', 'gender', 'marital_status', 'role'];
  const safeSortColumn = allowedSortColumns.includes(sortColumn) ? sortColumn : 'real_dob';
  const safeSortDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countQuery = `SELECT COUNT(*)::int AS total_records FROM tbl_appusers u WHERE ${whereClause}`;
  const { rows: countRows } = await pool.query(countQuery, values);
  const totalRecords = countRows[0].total_records;

  // Get paginated data
  const dataQuery = `
    SELECT 
      u.id,
      u.employee_id,
      u.first_name,
      u.last_name,
      COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)) AS full_name,
      u.real_dob::text AS birthday_date,
      TO_CHAR(u.real_dob, 'Month DD') AS formatted_birthday,
      u.gender,
      u.marital_status,
      u.role AS user_type,
      u.email,
      u.mobile,
      u.avatar,
      u.job_title,
      u.location,
      u.sub_unit
    FROM tbl_appusers u
    WHERE ${whereClause}
    ORDER BY u.${safeSortColumn} ${safeSortDirection}
    LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
  `;
  
  values.push(limit, offset);
  const { rows: dataRows } = await pool.query(dataQuery, values);

  return {
    reportData: dataRows,
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    currentPage: page,
  };
}

/**
 * Work Anniversary Report Query
 * Retrieves employees with upcoming work anniversaries filtered by role access
 */
async function getWorkAnniversaryReportData(filterCriteria, userContext) {
  const { monthFilter, dateFrom, dateTo, employeeId, employeeName, yearFilter, departmentFilter, page, limit, sortColumn, sortDirection } = filterCriteria;
  const { userId, userRole } = userContext;
  
  const offset = (page - 1) * limit;
  const conditions = ['u.is_deleted = FALSE', 'u.is_active = TRUE', 'u.joined_date IS NOT NULL'];
  const values = [];
  let valueIndex = 1;

  // Role-based access control
  if (userRole === 'employee') {
    conditions.push(`u.id = $${valueIndex}`);
    values.push(userId);
    valueIndex++;
  } else if (userRole === 'empmanager') {
    conditions.push(`(u.id = $${valueIndex} OR $${valueIndex} = ANY(
      SELECT UNNEST(
        CASE 
          WHEN supervisors IS NULL OR TRIM(supervisors) = '' THEN ARRAY[]::bigint[]
          ELSE (
            SELECT ARRAY_AGG(NULLIF(TRIM(elem::text), '')::bigint)
            FROM jsonb_array_elements_text(supervisors::jsonb) AS elem
            WHERE TRIM(elem::text) ~ '^[0-9]+$'
          )
        END
      )
    ))`);
    values.push(userId);
    valueIndex++;
  }

  // Month filter
  if (monthFilter) {
    conditions.push(`EXTRACT(MONTH FROM u.joined_date) = $${valueIndex}::int`);
    values.push(parseInt(monthFilter, 10));
    valueIndex++;
  }

  // Date range filter
  if (dateFrom && dateTo) {
    conditions.push(`TO_CHAR(u.joined_date, 'MM-DD') BETWEEN $${valueIndex} AND $${valueIndex + 1}`);
    values.push(dateFrom, dateTo);
    valueIndex += 2;
  }

  if (employeeId) {
    conditions.push(`u.employee_id ILIKE $${valueIndex}`);
    values.push(`%${employeeId}%`);
    valueIndex++;
  }

  if (employeeName) {
    conditions.push(`(u.name ILIKE $${valueIndex} OR u.first_name ILIKE $${valueIndex} OR u.last_name ILIKE $${valueIndex})`);
    values.push(`%${employeeName}%`);
    valueIndex++;
  }

  // Filter by years of service
  if (yearFilter) {
    const currentYear = new Date().getFullYear();
    conditions.push(`EXTRACT(YEAR FROM AGE(NOW(), u.joined_date)) = $${valueIndex}::int`);
    values.push(parseInt(yearFilter, 10));
    valueIndex++;
  }

  if (departmentFilter) {
    conditions.push(`u.sub_unit = $${valueIndex}`);
    values.push(departmentFilter);
    valueIndex++;
  }

  const whereClause = conditions.join(' AND ');
  
  // Validate sort column
  const allowedSortColumns = ['employee_id', 'name', 'joined_date', 'sub_unit', 'job_title', 'location', 'years_of_service'];
  const safeSortColumn = allowedSortColumns.includes(sortColumn) ? sortColumn : 'joined_date';
  const safeSortDirection = sortDirection === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countQuery = `SELECT COUNT(*)::int AS total_records FROM tbl_appusers u WHERE ${whereClause}`;
  const { rows: countRows } = await pool.query(countQuery, values);
  const totalRecords = countRows[0].total_records;

  // Get paginated data with calculated tenure
  const dataQuery = `
    SELECT 
      u.id,
      u.employee_id,
      COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)) AS employee_name,
      u.first_name,
      u.last_name,
      u.joined_date::text AS date_of_joining,
      TO_CHAR(u.joined_date, 'Month DD') AS formatted_anniversary,
      EXTRACT(YEAR FROM AGE(NOW(), u.joined_date))::int AS years_of_service,
      EXTRACT(MONTH FROM AGE(NOW(), u.joined_date))::int AS additional_months,
      u.job_title AS designation,
      u.sub_unit AS department,
      u.location,
      u.email,
      u.mobile,
      u.avatar,
      u.employment_status,
      u.role AS user_type
    FROM tbl_appusers u
    WHERE ${whereClause}
    ORDER BY ${safeSortColumn === 'years_of_service' ? 'EXTRACT(YEAR FROM AGE(NOW(), u.joined_date))' : `u.${safeSortColumn}`} ${safeSortDirection}
    LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
  `;
  
  values.push(limit, offset);
  const { rows: dataRows } = await pool.query(dataQuery, values);

  return {
    reportData: dataRows,
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    currentPage: page,
  };
}

/**
 * Get upcoming birthdays for notification system (next N days)
 */
async function getUpcomingBirthdays(daysAhead = 2) {
  const query = `
    SELECT 
      u.id,
      u.employee_id,
      u.email,
      COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.last_name)) AS employee_name,
      u.real_dob::text AS birthday_date,
      TO_CHAR(u.real_dob, 'Month DD') AS formatted_birthday,
      u.job_title,
      u.sub_unit,
      u.location
    FROM tbl_appusers u
    WHERE u.is_deleted = FALSE 
      AND u.is_active = TRUE 
      AND u.real_dob IS NOT NULL
      AND TO_CHAR(u.real_dob, 'MM-DD') BETWEEN 
          TO_CHAR(CURRENT_DATE + INTERVAL '${daysAhead} days', 'MM-DD') 
          AND TO_CHAR(CURRENT_DATE + INTERVAL '${daysAhead} days', 'MM-DD')
    ORDER BY TO_CHAR(u.real_dob, 'MM-DD')
  `;
  
  const { rows } = await pool.query(query);
  return rows;
}

/**
 * Get upcoming work anniversaries for notification system (next N days)
 */
async function getUpcomingWorkAnniversaries(daysAhead = 2) {
  const query = `
    SELECT 
      u.id,
      u.employee_id,
      u.email,
      COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.last_name)) AS employee_name,
      u.joined_date::text AS date_of_joining,
      TO_CHAR(u.joined_date, 'Month DD') AS formatted_anniversary,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE + INTERVAL '${daysAhead} days', u.joined_date))::int AS years_completing,
      u.job_title,
      u.sub_unit,
      u.location
    FROM tbl_appusers u
    WHERE u.is_deleted = FALSE 
      AND u.is_active = TRUE 
      AND u.joined_date IS NOT NULL
      AND TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '${daysAhead} days', 'MM-DD')
      AND EXTRACT(YEAR FROM AGE(CURRENT_DATE + INTERVAL '${daysAhead} days', u.joined_date)) >= 1
    ORDER BY years_completing DESC
  `;
  
  const { rows } = await pool.query(query);
  return rows;
}

/**
 * Notification Configuration Management
 */
async function getNotificationConfig(notificationType) {
  const { rows } = await pool.query(
    `SELECT id, notification_type, recipient_user_ids, days_before, is_active, created_at, updated_at
     FROM tbl_report_notification_config
     WHERE notification_type = $1`,
    [notificationType]
  );
  return rows[0] || null;
}

async function updateNotificationConfig(notificationType, recipientUserIds, daysBefore, isActive, updatedBy) {
  const { rows } = await pool.query(
    `UPDATE tbl_report_notification_config
     SET recipient_user_ids = $2, days_before = $3, is_active = $4, updated_by = $5, updated_at = NOW()
     WHERE notification_type = $1
     RETURNING *`,
    [notificationType, recipientUserIds, daysBefore, isActive, updatedBy]
  );
  return rows[0];
}

async function logNotificationSent(notificationType, employeeId, eventDate, recipientUserIds, emailStatus, errorMessage = null) {
  await pool.query(
    `INSERT INTO tbl_report_notification_log 
     (notification_type, employee_id, event_date, recipient_user_ids, email_status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [notificationType, employeeId, eventDate, recipientUserIds, emailStatus, errorMessage]
  );
}

async function checkNotificationAlreadySent(notificationType, employeeId, eventDate) {
  const { rows } = await pool.query(
    `SELECT id FROM tbl_report_notification_log
     WHERE notification_type = $1 
       AND employee_id = $2 
       AND event_date = $3 
       AND email_status = 'sent'
     LIMIT 1`,
    [notificationType, employeeId, eventDate]
  );
  return rows.length > 0;
}

/**
 * Get distinct filter values for dropdowns
 */
async function getDistinctSubUnits() {
  const { rows } = await pool.query(
    `SELECT DISTINCT sub_unit FROM tbl_appusers 
     WHERE sub_unit IS NOT NULL AND sub_unit != '' AND is_deleted = FALSE
     ORDER BY sub_unit`
  );
  return rows.map(r => r.sub_unit);
}

async function getDistinctLocations() {
  const { rows } = await pool.query(
    `SELECT DISTINCT location FROM tbl_appusers 
     WHERE location IS NOT NULL AND location != '' AND is_deleted = FALSE
     ORDER BY location`
  );
  return rows.map(r => r.location);
}

export default {
  getTerminationReportData,
  getBirthdayReportData,
  getWorkAnniversaryReportData,
  getUpcomingBirthdays,
  getUpcomingWorkAnniversaries,
  getNotificationConfig,
  updateNotificationConfig,
  logNotificationSent,
  checkNotificationAlreadySent,
  getDistinctSubUnits,
  getDistinctLocations,
};
