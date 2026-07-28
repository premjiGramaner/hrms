import pool from "../config/db.js";

/**
 * Termination Report Query
 * Retrieves terminated employees from the termination history table
 * Uses tbl_employee_terminations for real-time termination tracking
 */
async function getTerminationReportData(filterCriteria, paginationOptions) {
  const {
    dateFrom,
    dateTo,
    groupCompany,
    location,
    employeeId,
    employeeName,
    page,
    limit,
    sortColumn,
    sortDirection,
  } = filterCriteria;

  const offset = (page - 1) * limit;
  const conditions = ["t.is_deleted = FALSE"];
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

  const whereClause = conditions.join(" AND ");

  // Validate sort column to prevent SQL injection
  const allowedSortColumns = [
    "employee_code",
    "employee_name",
    "job_title",
    "sub_unit",
    "location",
    "date_of_joining",
    "termination_date",
  ];
  const safeSortColumn = allowedSortColumns.includes(sortColumn)
    ? sortColumn
    : "termination_date";
  const safeSortDirection = sortDirection === "asc" ? "ASC" : "DESC";

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
      COALESCE(
        CASE
          -- If supervisor_names exists and is not empty, use it
          WHEN t.supervisor_names IS NOT NULL AND TRIM(t.supervisor_names) != '' 
               AND t.supervisor_names != 'N/A' THEN t.supervisor_names
          -- Otherwise try to get from employee record
          ELSE (
            SELECT 
              CASE 
                WHEN u.supervisors IS NULL OR TRIM(u.supervisors) = '' OR u.supervisors = '[]' THEN NULL
                -- Parse JSON array and join names
                WHEN u.supervisors::text ~ '^\\[' THEN (
                  SELECT STRING_AGG(TRIM(BOTH '\"' FROM elem::text), ', ')
                  FROM jsonb_array_elements_text(u.supervisors::jsonb) AS elem
                  WHERE TRIM(BOTH '\"' FROM elem::text) != ''
                )
                -- If it's just a plain string, use it
                ELSE TRIM(BOTH '\"' FROM u.supervisors)
              END
            FROM tbl_appusers u
            WHERE u.id = t.employee_id
          )
        END,
        'N/A'
      ) AS actual_supervisor,
      COALESCE(t.terminated_by_name, 'System') AS terminated_by,
      -- Check if user is deleted/terminated
      COALESCE(
        (SELECT u.is_deleted FROM tbl_appusers u WHERE u.id = t.employee_id),
        TRUE
      ) AS is_user_deleted,
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

async function getBirthdayReportData(filterCriteria, userContext) {
  const {
    monthFilter,
    dateFrom,
    dateTo,
    employeeId,
    employeeName,
    genderFilter,
    maritalStatusFilter,
    roleFilter,
    page,
    limit,
    sortColumn,
    sortDirection,
  } = filterCriteria;
  const { userId, userRole } = userContext;

  const offset = (page - 1) * limit;
  const conditions = [
    "u.is_deleted = FALSE",
    "u.is_active = TRUE",
    "u.real_dob IS NOT NULL",
  ];
  const values = [];
  let valueIndex = 1;

  if (userRole === "employee") {
    conditions.push(`u.id = $${valueIndex}`);
    values.push(userId);
    valueIndex++;
  }

  if (monthFilter) {
    conditions.push(`EXTRACT(MONTH FROM u.real_dob) = $${valueIndex}::int`);
    values.push(parseInt(monthFilter, 10));
    valueIndex++;
  }

  if (dateFrom && dateTo) {
    conditions.push(
      `TO_CHAR(u.real_dob, 'MM-DD') BETWEEN $${valueIndex} AND $${valueIndex + 1}`,
    );
    values.push(dateFrom, dateTo);
    valueIndex += 2;
  }

  if (employeeId) {
    conditions.push(`u.employee_id ILIKE $${valueIndex}`);
    values.push(`%${employeeId}%`);
    valueIndex++;
  }

  if (employeeName) {
    conditions.push(
      `(u.name ILIKE $${valueIndex} OR u.first_name ILIKE $${valueIndex} OR u.last_name ILIKE $${valueIndex})`,
    );
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

  const whereClause = conditions.join(" AND ");

  const allowedSortColumns = [
    "employee_id",
    "first_name",
    "last_name",
    "name",
    "real_dob",
    "gender",
    "marital_status",
    "role",
  ];
  const safeSortColumn = allowedSortColumns.includes(sortColumn)
    ? sortColumn
    : "real_dob";
  const safeSortDirection = sortDirection === "asc" ? "ASC" : "DESC";

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

async function getWorkAnniversaryReportData(filterCriteria, userContext) {
  const {
    monthFilter,
    dateFrom,
    dateTo,
    employeeId,
    employeeName,
    yearFilter,
    departmentFilter,
    page,
    limit,
    sortColumn,
    sortDirection,
  } = filterCriteria;
  const { userId, userRole } = userContext;

  const offset = (page - 1) * limit;
  const conditions = [
    "u.is_deleted = FALSE",
    "u.is_active = TRUE",
    "u.joined_date IS NOT NULL",
  ];
  const values = [];
  let valueIndex = 1;

  if (userRole === "employee") {
    conditions.push(`u.id = $${valueIndex}`);
    values.push(userId);
    valueIndex++;
  }

  if (monthFilter) {
    conditions.push(`EXTRACT(MONTH FROM u.joined_date) = $${valueIndex}::int`);
    values.push(parseInt(monthFilter, 10));
    valueIndex++;
  }

  if (dateFrom && dateTo) {
    conditions.push(
      `TO_CHAR(u.joined_date, 'MM-DD') BETWEEN $${valueIndex} AND $${valueIndex + 1}`,
    );
    values.push(dateFrom, dateTo);
    valueIndex += 2;
  }

  if (employeeId) {
    conditions.push(`u.employee_id ILIKE $${valueIndex}`);
    values.push(`%${employeeId}%`);
    valueIndex++;
  }

  if (employeeName) {
    conditions.push(
      `(u.name ILIKE $${valueIndex} OR u.first_name ILIKE $${valueIndex} OR u.last_name ILIKE $${valueIndex})`,
    );
    values.push(`%${employeeName}%`);
    valueIndex++;
  }

  if (yearFilter) {
    conditions.push(
      `EXTRACT(YEAR FROM AGE(NOW(), u.joined_date)) = $${valueIndex}::int`,
    );
    values.push(parseInt(yearFilter, 10));
    valueIndex++;
  }

  if (departmentFilter) {
    conditions.push(`u.sub_unit = $${valueIndex}`);
    values.push(departmentFilter);
    valueIndex++;
  }

  const whereClause = conditions.join(" AND ");

  const allowedSortColumns = [
    "employee_id",
    "name",
    "joined_date",
    "sub_unit",
    "job_title",
    "location",
    "years_of_service",
  ];
  const safeSortColumn = allowedSortColumns.includes(sortColumn)
    ? sortColumn
    : "joined_date";
  const safeSortDirection = sortDirection === "asc" ? "ASC" : "DESC";

  const countQuery = `SELECT COUNT(*)::int AS total_records FROM tbl_appusers u WHERE ${whereClause}`;
  const { rows: countRows } = await pool.query(countQuery, values);
  const totalRecords = countRows[0].total_records;

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
    ORDER BY ${safeSortColumn === "years_of_service" ? "EXTRACT(YEAR FROM AGE(NOW(), u.joined_date))" : `u.${safeSortColumn}`} ${safeSortDirection}
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

async function getUpcomingBirthdays(daysAhead = 2) {
  const dateChecks = [];
  for (let i = 0; i <= daysAhead; i++) {
    dateChecks.push(
      `TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '${i} days', 'MM-DD')`,
    );
  }

  const dateCondition = dateChecks.join(" OR ");

  const query = `
    SELECT 
      u.id,
      u.employee_id,
      u.email,
      COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.last_name)) AS employee_name,
      u.real_dob::text AS birthday_date,
      TO_CHAR(u.real_dob, 'Month DD') AS formatted_birthday,
      CASE 
        WHEN TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') THEN 'Today'
        WHEN TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'MM-DD') THEN 'Tomorrow'
        WHEN TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'MM-DD') THEN 'In 2 days'
        ELSE 'In ' || (
          SELECT COUNT(*) 
          FROM generate_series(0, ${daysAhead}) AS day_num
          WHERE TO_CHAR(CURRENT_DATE + (day_num || ' days')::INTERVAL, 'MM-DD') = TO_CHAR(u.real_dob, 'MM-DD')
        ) || ' days'
      END AS when_is_birthday,
      u.job_title,
      u.sub_unit,
      u.location
    FROM tbl_appusers u
    WHERE u.is_deleted = FALSE 
      AND u.is_active = TRUE 
      AND u.real_dob IS NOT NULL
      AND (${dateCondition})
    ORDER BY 
      CASE 
        WHEN TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') THEN 0
        WHEN TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'MM-DD') THEN 1
        WHEN TO_CHAR(u.real_dob, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'MM-DD') THEN 2
        ELSE 3
      END,
      u.real_dob
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function getUpcomingWorkAnniversaries(daysAhead = 2) {
  const dateChecks = [];
  for (let i = 0; i <= daysAhead; i++) {
    dateChecks.push(
      `TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '${i} days', 'MM-DD')`,
    );
  }

  const dateCondition = dateChecks.join(" OR ");

  const query = `
    SELECT 
      u.id,
      u.employee_id,
      u.email,
      COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.last_name)) AS employee_name,
      u.joined_date::text AS date_of_joining,
      TO_CHAR(u.joined_date, 'Month DD') AS formatted_anniversary,
      CASE 
        WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.joined_date))::int
        WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'MM-DD') THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE + INTERVAL '1 day', u.joined_date))::int
        WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'MM-DD') THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE + INTERVAL '2 day', u.joined_date))::int
        ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE + INTERVAL '${daysAhead} days', u.joined_date))::int
      END AS years_completing,
      CASE 
        WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') THEN 'Today'
        WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'MM-DD') THEN 'Tomorrow'
        WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'MM-DD') THEN 'In 2 days'
        ELSE 'Upcoming'
      END AS when_is_anniversary,
      u.job_title,
      u.sub_unit,
      u.location
    FROM tbl_appusers u
    WHERE u.is_deleted = FALSE 
      AND u.is_active = TRUE 
      AND u.joined_date IS NOT NULL
      AND (${dateCondition})
      AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.joined_date)) >= 1
    ORDER BY 
      CASE 
        WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD') THEN 0
        WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'MM-DD') THEN 1
        WHEN TO_CHAR(u.joined_date, 'MM-DD') = TO_CHAR(CURRENT_DATE + INTERVAL '2 days', 'MM-DD') THEN 2
        ELSE 3
      END,
      years_completing DESC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

async function getNotificationConfig(notificationType) {
  const { rows } = await pool.query(
    `SELECT id, notification_type, recipient_user_ids, days_before, is_active, external_emails, created_at, updated_at
     FROM tbl_report_notification_config
     WHERE notification_type = $1`,
    [notificationType],
  );
  return rows[0] || null;
}

async function updateNotificationConfig(
  notificationType,
  recipientUserIds,
  daysBefore,
  isActive,
  updatedBy,
  externalEmails = "",
) {
  const { rows } = await pool.query(
    `UPDATE tbl_report_notification_config
     SET recipient_user_ids = $2, days_before = $3, is_active = $4, updated_by = $5, external_emails = $6, updated_at = NOW()
     WHERE notification_type = $1
     RETURNING *`,
    [
      notificationType,
      recipientUserIds,
      daysBefore,
      isActive,
      updatedBy,
      externalEmails,
    ],
  );
  return rows[0];
}

async function logNotificationSent(
  notificationType,
  employeeId,
  eventDate,
  recipientUserIds,
  emailStatus,
  errorMessage = null,
) {
  await pool.query(
    `INSERT INTO tbl_report_notification_log 
     (notification_type, employee_id, event_date, recipient_user_ids, email_status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      notificationType,
      employeeId,
      eventDate,
      recipientUserIds,
      emailStatus,
      errorMessage,
    ],
  );
}

async function checkNotificationAlreadySent(
  notificationType,
  employeeId,
  eventDate,
) {
  const { rows } = await pool.query(
    `SELECT id FROM tbl_report_notification_log
     WHERE notification_type = $1 
       AND employee_id = $2 
       AND event_date = $3 
       AND email_status = 'sent'
     LIMIT 1`,
    [notificationType, employeeId, eventDate],
  );
  return rows.length > 0;
}

async function getDistinctSubUnits() {
  const { rows } = await pool.query(
    `SELECT DISTINCT sub_unit FROM tbl_appusers 
     WHERE sub_unit IS NOT NULL AND sub_unit != '' AND is_deleted = FALSE
     ORDER BY sub_unit`,
  );
  return rows.map((r) => r.sub_unit);
}

async function getDistinctLocations() {
  const { rows } = await pool.query(
    `SELECT DISTINCT location FROM tbl_appusers 
     WHERE location IS NOT NULL AND location != '' AND is_deleted = FALSE
     ORDER BY location`,
  );
  return rows.map((locationRow) => locationRow.location);
}

async function getEmployeeContactReportData(filterCriteria, userContext) {
  const {
    search,
    location,
    gender,
    employmentStatus,
    subUnit,
    jobTitle,
    page,
    limit,
    sortColumn,
    sortDirection,
  } = filterCriteria;
  const { userId, userRole } = userContext;

  const offset = (page - 1) * limit;
  const conditions = [
    "u.is_deleted = FALSE",
    "u.is_active = TRUE",
    "(u.employment_status IS NULL OR u.employment_status != 'Terminated')",
  ];
  const values = [];
  let valueIndex = 1;

  if (userRole === "employee") {
    conditions.push(`u.id = $${valueIndex}`);
    values.push(userId);
    valueIndex++;
  }

  if (search) {
    conditions.push(
      `(
        u.name ILIKE $${valueIndex} OR 
        u.first_name ILIKE $${valueIndex} OR 
        u.middle_name ILIKE $${valueIndex} OR
        u.last_name ILIKE $${valueIndex} OR 
        u.employee_id ILIKE $${valueIndex} OR
        u.email ILIKE $${valueIndex} OR
        u.mobile ILIKE $${valueIndex} OR
        u.home_tel ILIKE $${valueIndex} OR
        u.work_tel ILIKE $${valueIndex} OR
        u.address1 ILIKE $${valueIndex} OR
        u.address2 ILIKE $${valueIndex} OR
        u.city ILIKE $${valueIndex} OR
        u.state ILIKE $${valueIndex} OR
        u.country ILIKE $${valueIndex} OR
        u.zip ILIKE $${valueIndex} OR
        u.location ILIKE $${valueIndex} OR
        u.gender ILIKE $${valueIndex} OR
        u.employment_status ILIKE $${valueIndex} OR
        u.job_title ILIKE $${valueIndex} OR
        u.sub_unit ILIKE $${valueIndex}
      )`,
    );
    values.push(`%${search}%`);
    valueIndex++;
  }

  if (location) {
    conditions.push(`u.location = $${valueIndex}`);
    values.push(location);
    valueIndex++;
  }

  if (gender) {
    conditions.push(`u.gender = $${valueIndex}`);
    values.push(gender);
    valueIndex++;
  }

  if (employmentStatus) {
    conditions.push(`u.employment_status = $${valueIndex}`);
    values.push(employmentStatus);
    valueIndex++;
  }

  if (subUnit) {
    conditions.push(`u.sub_unit = $${valueIndex}`);
    values.push(subUnit);
    valueIndex++;
  }

  if (jobTitle) {
    conditions.push(`u.job_title = $${valueIndex}`);
    values.push(jobTitle);
    valueIndex++;
  }

  const whereClause = conditions.join(" AND ");

  const allowedSortColumns = [
    "employee_id",
    "first_name",
    "middle_name",
    "last_name",
    "name",
    "dob",
    "email",
    "mobile",
    "home_tel",
    "work_tel",
    "location",
    "gender",
    "employment_status",
    "job_title",
    "sub_unit",
  ];
  const safeSortColumn = allowedSortColumns.includes(sortColumn)
    ? sortColumn
    : "name";
  const safeSortDirection = sortDirection === "asc" ? "ASC" : "DESC";

  const countQuery = `SELECT COUNT(*)::int AS total_records FROM tbl_appusers u WHERE ${whereClause}`;
  const { rows: countRows } = await pool.query(countQuery, values);
  const totalRecords = countRows[0].total_records;

  const dataQuery = `
    SELECT 
      u.id,
      u.employee_id,
      COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)) AS name,
      u.first_name,
      u.middle_name,
      u.last_name,
      u.email,
      u.mobile,
      u.home_tel,
      u.work_tel,
      u.dob::text,
      TO_CHAR(u.dob, 'DD Mon YYYY') AS formatted_dob,
      u.supervisors,
      CASE
        WHEN u.supervisors IS NULL OR TRIM(u.supervisors) = '' OR u.supervisors = '[]' THEN '[]'::json
        ELSE u.supervisors::json
      END AS supervisor_names,
      u.address1,
      u.address2,
      u.city,
      u.state,
      u.country,
      u.zip,
      u.location,
      u.gender,
      u.employment_status,
      u.job_title,
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

export default {
  getTerminationReportData,
  getBirthdayReportData,
  getWorkAnniversaryReportData,
  getEmployeeContactReportData,
  getUpcomingBirthdays,
  getUpcomingWorkAnniversaries,
  getNotificationConfig,
  updateNotificationConfig,
  logNotificationSent,
  checkNotificationAlreadySent,
  getDistinctSubUnits,
  getDistinctLocations,
};
