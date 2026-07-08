import pool from "../config/db.js";

async function findAllLeaveTypes() {
  const { rows } = await pool.query(
    `SELECT id, name, code, description, max_days, carry_forward, is_active
     FROM tbl_leave_types
     WHERE is_deleted = FALSE AND is_active = TRUE
     ORDER BY 
       CASE code
         WHEN 'PL' THEN 1
         WHEN 'CFPL' THEN 2
         WHEN 'SL' THEN 3
         WHEN 'CO' THEN 4
         WHEN 'LOP' THEN 5
         WHEN 'ML' THEN 6
         WHEN 'PTL' THEN 7
         WHEN 'WFH' THEN 8
         ELSE 99
       END`,
  );
  return rows;
}

async function getLeaveBalance(employeeId, year) {
  const { rows } = await pool.query(
    `SELECT e.id, e.employee_id, e.year,
            e.total_days, e.used_days, e.carried_days,
            (e.total_days + e.carried_days - e.used_days) AS net_balance,
            lt.id AS leave_type_id, lt.name AS leave_type_name, lt.code
     FROM tbl_leave_entitlements e
     JOIN tbl_leave_types lt ON lt.id = e.leave_type_id
     WHERE e.employee_id = $1 AND e.year = $2 AND e.is_deleted = FALSE
     ORDER BY 
       CASE lt.code
         WHEN 'PL' THEN 1
         WHEN 'CFPL' THEN 2
         WHEN 'SL' THEN 3
         WHEN 'CO' THEN 4
         WHEN 'LOP' THEN 5
         WHEN 'ML' THEN 6
         WHEN 'PTL' THEN 7
         WHEN 'WFH' THEN 8
         ELSE 99
       END`,
    [employeeId, year],
  );
  return rows;
}

async function getNetBalance(employeeId, leaveTypeId, year) {
  const { rows } = await pool.query(
    `SELECT (COALESCE(total_days,0) + COALESCE(carried_days,0) - COALESCE(used_days,0)) AS net_balance
     FROM tbl_leave_entitlements
     WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3 AND is_deleted = FALSE`,
    [employeeId, leaveTypeId, year],
  );
  return rows[0]?.net_balance ?? null;
}

async function deductLeaveBalance(employeeId, leaveTypeId, year, days, client) {
  const db = client || pool;
  await db.query(
    `UPDATE tbl_leave_entitlements
     SET used_days = used_days + $1, updated_at = NOW()
     WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4 AND is_deleted = FALSE`,
    [days, employeeId, leaveTypeId, year],
  );
}

async function restoreLeaveBalance(
  employeeId,
  leaveTypeId,
  year,
  days,
  client,
) {
  const db = client || pool;
  await db.query(
    `UPDATE tbl_leave_entitlements
     SET used_days = GREATEST(0, used_days - $1), updated_at = NOW()
     WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4 AND is_deleted = FALSE`,
    [days, employeeId, leaveTypeId, year],
  );
}

function buildFilters(filters, startIndex = 1) {
  const conditions = ["lr.is_deleted = FALSE"];
  const values = [];
  let paramIndex = startIndex;

  if (filters.from_date) {
    conditions.push(`lr.end_date >= $${paramIndex++}`);
    values.push(filters.from_date);
  }
  if (filters.to_date) {
    conditions.push(`lr.start_date <= $${paramIndex++}`);
    values.push(filters.to_date);
  }
  if (filters.employee_id) {
    conditions.push(`u.employee_id ILIKE $${paramIndex++}`);
    values.push(`%${filters.employee_id}%`);
  }
  if (filters.employee_name) {
    conditions.push(`u.name ILIKE $${paramIndex++}`);
    values.push(`%${filters.employee_name}%`);
  }
  if (filters.sub_unit) {
    conditions.push(`u.sub_unit = $${paramIndex++}`);
    values.push(filters.sub_unit);
  }
  if (filters.location) {
    conditions.push(`u.location = $${paramIndex++}`);
    values.push(filters.location);
  }
  if (filters.leave_type_id) {
    conditions.push(`lr.leave_type_id = $${paramIndex++}`);
    values.push(filters.leave_type_id);
  }
  if (filters.job_title) {
    conditions.push(`u.job_title = $${paramIndex++}`);
    values.push(filters.job_title);
  }
  if (filters.employment_status) {
    conditions.push(`u.employment_status = $${paramIndex++}`);
    values.push(filters.employment_status);
  }
  if (filters.job_category) {
    conditions.push(`u.job_category = $${paramIndex++}`);
    values.push(filters.job_category);
  }
  if (filters.attachment_status) {
    conditions.push(`lr.attachment_status = $${paramIndex++}`);
    values.push(filters.attachment_status);
  }
  if (filters.include_past === false || filters.include_past === "false") {
    conditions.push(`u.is_active = TRUE`);
  }
  if (
    filters.statuses &&
    Array.isArray(filters.statuses) &&
    filters.statuses.length > 0
  ) {
    const hasScheduled = filters.statuses.includes("Scheduled");
    const otherStatuses = filters.statuses.filter((s) => s !== "Scheduled");

    if (hasScheduled && otherStatuses.length > 0) {
      const placeholders = otherStatuses
        .map(() => `$${paramIndex++}`)
        .join(", ");
      conditions.push(`(
        lr.status IN (${placeholders}) OR 
        (lr.applied_on <= (lr.start_date - INTERVAL '1 month'))
      )`);
      values.push(...otherStatuses);
    } else if (hasScheduled) {
      conditions.push(`lr.applied_on <= (lr.start_date - INTERVAL '1 month')`);
    } else {
      const placeholders = otherStatuses
        .map(() => `$${paramIndex++}`)
        .join(", ");
      conditions.push(`lr.status IN (${placeholders})`);
      values.push(...otherStatuses);
    }
  }
  if (filters.only_subordinates && filters.supervisor_id) {
    conditions.push(`u.supervisors @> $${paramIndex++}::jsonb`);
    values.push(JSON.stringify([filters.supervisor_id]));
  }
  if (filters.own_employee_id !== undefined) {
    conditions.push(`lr.employee_id = $${paramIndex++}`);
    values.push(filters.own_employee_id);
  }

  return { clause: conditions.join(" AND "), values, nextIndex: paramIndex };
}

async function findLeaveRequests(filters = {}, page = 1, limit = 15) {
  const offset = (page - 1) * limit;
  const { clause, values } = buildFilters(filters);

  const dataQuery = `
    SELECT
      lr.id,
      u.employee_id,
      u.name                          AS employee_name,
      u.sub_unit,
      u.location,
      u.job_title,
      u.employment_status,
      u.job_category,
      lr.employee_id                  AS user_id,
      lr.leave_type_id,
      lt.name                         AS leave_type,
      lr.start_date::text,
      lr.end_date::text,
      lr.applied_on::text,
      lr.requested_days,
      lr.status,
      lr.reason,
      lr.rejection_reason,
      lr.attachment_status,
      lr.comments,
      COALESCE(lr.net_leave_balance_at_request, 0) AS net_leave_balance
    FROM tbl_leave_requests lr
    JOIN tbl_appusers u  ON u.id = lr.employee_id AND u.is_deleted = FALSE
    JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id
    WHERE ${clause}
    ORDER BY lr.applied_on DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM tbl_leave_requests lr
    JOIN tbl_appusers u  ON u.id = lr.employee_id AND u.is_deleted = FALSE
    JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id
    WHERE ${clause}`;

  const [dataRes, countRes] = await Promise.all([
    pool.query(dataQuery, [...values, limit, offset]),
    pool.query(countQuery, values),
  ]);

  const total = countRes.rows[0].total;
  return {
    data: dataRes.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

async function findLeaveById(id) {
  const { rows } = await pool.query(
    `SELECT 
       lr.id, lr.employee_id, lr.leave_type_id, lr.start_date, lr.end_date,
       lr.applied_on, lr.requested_days, lr.status, lr.reason, lr.rejection_reason,
       lr.attachment_path, lr.attachment_status, lr.comments,
       lr.approved_by, lr.approved_on, lr.rejected_by, lr.rejected_on,
       lr.cancelled_by, lr.cancelled_on, lr.created_at, lr.updated_at,
       lt.name AS leave_type,
       u.employee_id AS employee_code, u.name AS employee_name, u.avatar
     FROM tbl_leave_requests lr
     JOIN tbl_appusers u  ON u.id = lr.employee_id
     JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.id = $1 AND lr.is_deleted = FALSE`,
    [id],
  );
  return rows[0] || null;
}

async function findLeaveDetails(id) {
  const { rows } = await pool.query(
    `SELECT
       lr.id,
       lr.employee_id        AS user_id,
       u.employee_id,
       u.name                AS employee_name,
       u.avatar,
       u.job_title,
       u.sub_unit,
       u.location,
       lr.leave_type_id,
       lt.name               AS leave_type,
       lt.code               AS leave_type_code,
       lr.start_date::text,
       lr.end_date::text,
       lr.applied_on::text,
       lr.requested_days,
       lr.status,
       lr.reason,
       lr.rejection_reason,
       lr.attachment_path,
       lr.attachment_status,
       lr.comments,
       lr.approved_by,
       lr.approved_on::text,
       lr.rejected_by,
       lr.rejected_on::text,
       lr.cancelled_by,
       lr.cancelled_on::text,
       COALESCE(lr.net_leave_balance_at_request, 0) AS net_leave_balance
     FROM tbl_leave_requests lr
     JOIN tbl_appusers u  ON u.id = lr.employee_id
     JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.id = $1 AND lr.is_deleted = FALSE`,
    [id],
  );
  return rows[0] || null;
}

async function updateLeaveAttachment(id, attachmentPath) {
  await pool.query(
    `UPDATE tbl_leave_requests
     SET attachment_path = $1, attachment_status = 'Available', updated_at = NOW()
     WHERE id = $2 AND is_deleted = FALSE`,
    [attachmentPath, id],
  );
}

async function createLeaveRequest(data) {
  const { rows } = await pool.query(
    `INSERT INTO tbl_leave_requests
       (employee_id, leave_type_id, start_date, end_date, requested_days, reason,
        status, attachment_status, comments)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      data.employee_id,
      data.leave_type_id,
      data.start_date,
      data.end_date,
      data.requested_days || 1,
      data.reason || null,
      data.status || "Pending Approval",
      data.attachment_status || "Not Required",
      data.comments || null,
    ],
  );
  return rows[0];
}

async function createLeaveRequestWithDeduction(
  data,
  leaveTypeId,
  year,
  requestedDays,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Re-check balance with a row lock to prevent race conditions
    const { rows: balRows } = await client.query(
      `SELECT (total_days + carried_days - used_days) AS net_balance
       FROM tbl_leave_entitlements
       WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3 AND is_deleted = FALSE
       FOR UPDATE`,
      [data.employee_id, leaveTypeId, year],
    );
    if (!balRows.length) {
      throw Object.assign(
        new Error(
          "No entitlement found for the selected leave type and period.",
        ),
        { statusCode: 422 },
      );
    }
    const currentBalance = Number(balRows[0].net_balance);
    if (currentBalance < requestedDays) {
      throw Object.assign(
        new Error(
          `Insufficient leave balance. Available: ${currentBalance.toFixed(2)} day(s).`,
        ),
        { statusCode: 422 },
      );
    }

    // Store the balance BEFORE deduction - this is the balance at time of request
    const balanceAtRequest = currentBalance;

    const { rows } = await client.query(
      `INSERT INTO tbl_leave_requests
         (employee_id, leave_type_id, start_date, end_date, requested_days, reason,
          status, attachment_status, comments, net_leave_balance_at_request)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        data.employee_id,
        data.leave_type_id,
        data.start_date,
        data.end_date,
        data.requested_days || 1,
        data.reason || null,
        data.status || "Pending Approval",
        data.attachment_status || "Not Required",
        data.comments || null,
        balanceAtRequest,
      ],
    );
    await client.query(
      `UPDATE tbl_leave_entitlements
       SET used_days = used_days + $1, updated_at = NOW()
       WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4 AND is_deleted = FALSE`,
      [requestedDays, data.employee_id, leaveTypeId, year],
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function toActorId(id) {
  const n = parseInt(id);
  return isNaN(n) || n <= 0 ? null : n;
}

async function approveLeave(id, approverId) {
  const { rows } = await pool.query(
    `UPDATE tbl_leave_requests
     SET status = 'Approved', approved_by = $1, approved_on = NOW(), updated_at = NOW()
     WHERE id = $2 AND is_deleted = FALSE
     RETURNING employee_id, leave_type_id, requested_days,
               EXTRACT(YEAR FROM start_date)::int AS leave_year`,
    [toActorId(approverId), id],
  );
  return rows[0] || null;
}

async function rejectLeave(id, rejectorId, rejectionReason) {
  const { rows } = await pool.query(
    `UPDATE tbl_leave_requests
     SET status = 'Rejected', rejected_by = $1, rejected_on = NOW(),
         rejection_reason = $2, updated_at = NOW()
     WHERE id = $3 AND is_deleted = FALSE
     RETURNING id`,
    [toActorId(rejectorId), rejectionReason, id],
  );
  return rows[0] || null;
}

async function cancelLeave(id, cancelledById) {
  const { rows } = await pool.query(
    `UPDATE tbl_leave_requests
     SET status = 'Cancelled', cancelled_by = $1, cancelled_on = NOW(), updated_at = NOW()
     WHERE id = $2 AND is_deleted = FALSE
     RETURNING employee_id, leave_type_id, requested_days,
               EXTRACT(YEAR FROM start_date)::int AS leave_year, status AS old_status`,
    [toActorId(cancelledById), id],
  );
  return rows[0] || null;
}

async function findLeaveFilterOptions() {
  const [subUnits, locations, jobTitles, empStatuses, jobCategories] =
    await Promise.all([
      // Get Sub Units from tbl_sub_units with id and name
      pool.query(
        `SELECT id, sub_unit_name AS name FROM tbl_sub_units WHERE is_active = TRUE ORDER BY sub_unit_name`,
      ),
      // Get Locations from distinct employee records (no lookup table exists)
      pool.query(
        `SELECT DISTINCT location AS val FROM tbl_appusers WHERE location IS NOT NULL AND location <> '' AND is_deleted = FALSE ORDER BY val`,
      ),
      // Get Job Titles from tbl_job_titles with id and title
      pool.query(
        `SELECT id, title AS name FROM tbl_job_titles WHERE is_active = TRUE ORDER BY title`,
      ),
      // Get Employment Statuses from distinct employee records (no lookup table exists)
      pool.query(
        `SELECT DISTINCT employment_status AS val FROM tbl_appusers WHERE employment_status IS NOT NULL AND employment_status <> '' AND is_deleted = FALSE ORDER BY val`,
      ),
      // Get Job Categories from tbl_job_categories with id and category name
      pool.query(
        `SELECT id, category AS name FROM tbl_job_categories WHERE is_active = TRUE ORDER BY category`,
      ),
    ]);
  return {
    sub_units: subUnits.rows, // Returns array of {id, name}
    locations: locations.rows.map((r) => r.val), // Returns array of strings (no IDs)
    job_titles: jobTitles.rows, // Returns array of {id, name}
    employment_statuses: empStatuses.rows.map((r) => r.val), // Returns array of strings (no IDs)
    job_categories: jobCategories.rows, // Returns array of {id, name}
  };
}

async function searchEmployees(q) {
  const { rows } = await pool.query(
    `SELECT id, employee_id, name, username, job_title, sub_unit
     FROM tbl_appusers
     WHERE is_deleted = FALSE AND is_active = TRUE
       AND (name ILIKE $1 OR employee_id ILIKE $1 OR username ILIKE $1)
     ORDER BY name
     LIMIT 15`,
    [`%${q}%`],
  );
  return rows;
}

async function getLeavesSummaryForExport(filters = {}) {
  const { clause, values } = buildFilters(filters);
  const { rows } = await pool.query(
    `SELECT
       lr.start_date::text,
       lr.end_date::text,
       lr.applied_on::text,

       u.employee_id,
       u.name           AS employee_name,
       u.job_title,
       u.employment_status,
       u.sub_unit,
       u.location,
       u.job_category,

       u.attendance_calc AS work_schedule,

       lt.name AS leave_type,
       'Days' AS unit,

       e.total_days AS entitlements,
       COALESCE(e.used_days,0) AS used,
       COALESCE(lr.net_leave_balance_at_request, 0) AS net_leave_balance,

       lr.requested_days,
       lr.status,
       lr.attachment_status,
       lr.comments

     FROM tbl_leave_requests lr
     JOIN tbl_appusers u ON u.id = lr.employee_id AND u.is_deleted = FALSE
     JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id

     LEFT JOIN tbl_leave_entitlements e
       ON e.employee_id = lr.employee_id
      AND e.leave_type_id = lr.leave_type_id
      AND e.year = CASE 
        WHEN EXTRACT(MONTH FROM lr.start_date) >= 4 
        THEN EXTRACT(YEAR FROM lr.start_date) + 1
        ELSE EXTRACT(YEAR FROM lr.start_date)
      END
      AND e.is_deleted = FALSE

     WHERE ${clause}
     ORDER BY lr.applied_on DESC`,
    values,
  );
  return rows;
}

async function getLeavesDetailForExport(filters = {}) {
  const { clause, values } = buildFilters(filters);
  const { rows } = await pool.query(
    `SELECT
       lr.start_date::text,
       lr.end_date::text,
       lr.applied_on::text,

       u.employee_id,
       u.name           AS employee_name,
       u.job_title,
       u.employment_status,
       u.sub_unit,
       u.location,
       u.job_category,

       u.attendance_calc AS work_schedule,

       lt.name AS leave_type,
       'Days' AS unit,

       COALESCE(e.total_days, 0) AS entitlements,
       COALESCE(e.used_days, 0) AS used,

       COALESCE(lr.net_leave_balance_at_request, 0) AS net_leave_balance,

       lr.requested_days,
       lr.status,
       lr.attachment_status,
       lr.comments,
       -- Duration in hours: requested_days * 8
       (COALESCE(lr.requested_days, 0) * 8) AS duration_hours

     FROM tbl_leave_requests lr
     JOIN tbl_appusers u ON u.id = lr.employee_id AND u.is_deleted = FALSE
     JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id

     LEFT JOIN tbl_leave_entitlements e
       ON e.employee_id = lr.employee_id
      AND e.leave_type_id = lr.leave_type_id
      AND e.year = CASE 
        WHEN EXTRACT(MONTH FROM lr.start_date) >= 4 
        THEN EXTRACT(YEAR FROM lr.start_date) + 1
        ELSE EXTRACT(YEAR FROM lr.start_date)
      END
      AND e.is_deleted = FALSE

     WHERE ${clause}
     ORDER BY lr.applied_on DESC`,
    values,
  );
  return rows;
}

async function checkLeaveOverlap(employeeId, startDate, endDate) {
  const { rows } = await pool.query(
    `SELECT id, start_date, end_date, status
     FROM tbl_leave_requests
     WHERE employee_id = $1
       AND is_deleted = FALSE
       AND status IN ('Pending Approval', 'Approved', 'Scheduled', 'Taken')
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )
     LIMIT 1`,
    [employeeId, startDate, endDate],
  );
  return rows.length > 0 ? rows[0] : null;
}

export {
  findAllLeaveTypes,
  getLeaveBalance,
  getNetBalance,
  deductLeaveBalance,
  restoreLeaveBalance,
  findLeaveRequests,
  findLeaveById,
  findLeaveDetails,
  updateLeaveAttachment,
  createLeaveRequest,
  createLeaveRequestWithDeduction,
  checkLeaveOverlap,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeavesSummaryForExport,
  getLeavesDetailForExport,
  findLeaveFilterOptions,
  searchEmployees,
};
