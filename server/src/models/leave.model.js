import pool from '../config/db.js';

async function findAllLeaveTypes() {
  const { rows } = await pool.query(
    `SELECT id, name, code, description, max_days, carry_forward, is_active
     FROM tbl_leave_types
     WHERE is_deleted = FALSE AND is_active = TRUE
     ORDER BY name`
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
     ORDER BY lt.name`,
    [employeeId, year]
  );
  return rows;
}

async function getNetBalance(employeeId, leaveTypeId, year) {
  const { rows } = await pool.query(
    `SELECT (COALESCE(total_days,0) + COALESCE(carried_days,0) - COALESCE(used_days,0)) AS net_balance
     FROM tbl_leave_entitlements
     WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3 AND is_deleted = FALSE`,
    [employeeId, leaveTypeId, year]
  );
  return rows[0]?.net_balance ?? null;
}

async function deductLeaveBalance(employeeId, leaveTypeId, year, days, client) {
  const q = client || pool;
  await q.query(
    `UPDATE tbl_leave_entitlements
     SET used_days = used_days + $1, updated_at = NOW()
     WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4 AND is_deleted = FALSE`,
    [days, employeeId, leaveTypeId, year]
  );
}

async function restoreLeaveBalance(employeeId, leaveTypeId, year, days, client) {
  const q = client || pool;
  await q.query(
    `UPDATE tbl_leave_entitlements
     SET used_days = GREATEST(0, used_days - $1), updated_at = NOW()
     WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4 AND is_deleted = FALSE`,
    [days, employeeId, leaveTypeId, year]
  );
}

function buildFilters(filters, startIndex = 1) {
  const conditions = ['lr.is_deleted = FALSE'];
  const values = [];
  let i = startIndex;

  if (filters.from_date) {
    conditions.push(`lr.end_date >= $${i++}`);
    values.push(filters.from_date);
  }
  if (filters.to_date) {
    conditions.push(`lr.start_date <= $${i++}`);
    values.push(filters.to_date);
  }
  if (filters.employee_id) {
    conditions.push(`u.employee_id ILIKE $${i++}`);
    values.push(`%${filters.employee_id}%`);
  }
  if (filters.employee_name) {
    conditions.push(`u.name ILIKE $${i++}`);
    values.push(`%${filters.employee_name}%`);
  }
  if (filters.sub_unit) {
    conditions.push(`u.sub_unit = $${i++}`);
    values.push(filters.sub_unit);
  }
  if (filters.location) {
    conditions.push(`u.location = $${i++}`);
    values.push(filters.location);
  }
  if (filters.leave_type_id) {
    conditions.push(`lr.leave_type_id = $${i++}`);
    values.push(filters.leave_type_id);
  }
  if (filters.job_title) {
    conditions.push(`u.job_title = $${i++}`);
    values.push(filters.job_title);
  }
  if (filters.employment_status) {
    conditions.push(`u.employment_status = $${i++}`);
    values.push(filters.employment_status);
  }
  if (filters.job_category) {
    conditions.push(`u.job_category = $${i++}`);
    values.push(filters.job_category);
  }
  if (filters.attachment_status) {
    conditions.push(`lr.attachment_status = $${i++}`);
    values.push(filters.attachment_status);
  }
  if (filters.include_past === false || filters.include_past === 'false') {
    conditions.push(`u.is_active = TRUE`);
  }
  if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
    const placeholders = filters.statuses.map(() => `$${i++}`).join(', ');
    conditions.push(`lr.status IN (${placeholders})`);
    values.push(...filters.statuses);
  }
  if (filters.only_subordinates && filters.supervisor_id) {
    conditions.push(`u.supervisors @> $${i++}::jsonb`);
    values.push(JSON.stringify([filters.supervisor_id]));
  }
  if (filters.own_employee_id) {
    conditions.push(`lr.employee_id = $${i++}`);
    values.push(filters.own_employee_id);
  }

  return { clause: conditions.join(' AND '), values, nextIndex: i };
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
      COALESCE(
        (SELECT (e.total_days + e.carried_days - e.used_days)
         FROM tbl_leave_entitlements e
         WHERE e.employee_id = lr.employee_id
           AND e.leave_type_id = lr.leave_type_id
           AND e.year = EXTRACT(YEAR FROM lr.start_date)
           AND e.is_deleted = FALSE
         LIMIT 1), 0
      ) AS net_leave_balance
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
    `SELECT lr.*, lt.name AS leave_type,
            u.employee_id, u.name AS employee_name, u.avatar
     FROM tbl_leave_requests lr
     JOIN tbl_appusers u  ON u.id = lr.employee_id
     JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.id = $1 AND lr.is_deleted = FALSE`,
    [id]
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
       COALESCE(
         (SELECT (e.total_days + e.carried_days - e.used_days)
          FROM tbl_leave_entitlements e
          WHERE e.employee_id = lr.employee_id
            AND e.leave_type_id = lr.leave_type_id
            AND e.year = EXTRACT(YEAR FROM lr.start_date)
            AND e.is_deleted = FALSE
          LIMIT 1), 0
       ) AS net_leave_balance
     FROM tbl_leave_requests lr
     JOIN tbl_appusers u  ON u.id = lr.employee_id
     JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.id = $1 AND lr.is_deleted = FALSE`,
    [id]
  );
  return rows[0] || null;
}

async function updateLeaveAttachment(id, attachmentPath) {
  await pool.query(
    `UPDATE tbl_leave_requests
     SET attachment_path = $1, attachment_status = 'Available', updated_at = NOW()
     WHERE id = $2 AND is_deleted = FALSE`,
    [attachmentPath, id]
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
      data.status || 'Pending Approval',
      data.attachment_status || 'Not Required',
      data.comments || null,
    ]
  );
  return rows[0];
}

function toActorId(id) {
  const n = parseInt(id);
  return (isNaN(n) || n <= 0) ? null : n;
}

async function approveLeave(id, approverId) {
  const { rows } = await pool.query(
    `UPDATE tbl_leave_requests
     SET status = 'Approved', approved_by = $1, approved_on = NOW(), updated_at = NOW()
     WHERE id = $2 AND is_deleted = FALSE
     RETURNING employee_id, leave_type_id, requested_days,
               EXTRACT(YEAR FROM start_date)::int AS leave_year`,
    [toActorId(approverId), id]
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
    [toActorId(rejectorId), rejectionReason, id]
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
    [toActorId(cancelledById), id]
  );
  return rows[0] || null;
}

async function getLeavesSummaryForExport(filters = {}) {
  const { clause, values } = buildFilters(filters);
  const { rows } = await pool.query(
    `SELECT
       u.employee_id,
       u.name           AS employee_name,
       lt.name          AS leave_type,
       COUNT(lr.id)     AS total_requests,
       SUM(lr.requested_days) AS total_days,
       SUM(CASE WHEN lr.status='Approved' THEN lr.requested_days ELSE 0 END) AS approved_days,
       SUM(CASE WHEN lr.status='Pending Approval' THEN lr.requested_days ELSE 0 END) AS pending_days,
       SUM(CASE WHEN lr.status='Rejected' THEN lr.requested_days ELSE 0 END) AS rejected_days
     FROM tbl_leave_requests lr
     JOIN tbl_appusers u ON u.id = lr.employee_id AND u.is_deleted = FALSE
     JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id
     WHERE ${clause}
     GROUP BY u.employee_id, u.name, lt.name
     ORDER BY u.name, lt.name`,
    values
  );
  return rows;
}

async function getLeavesDetailForExport(filters = {}) {
  const { clause, values } = buildFilters(filters);
  const { rows } = await pool.query(
    `SELECT
       u.employee_id,
       u.name           AS employee_name,
       lt.name          AS leave_type,
       lr.start_date::text,
       lr.end_date::text,
       lr.requested_days,
       lr.applied_on::text,
       lr.status,
       lr.reason,
       lr.rejection_reason
     FROM tbl_leave_requests lr
     JOIN tbl_appusers u ON u.id = lr.employee_id AND u.is_deleted = FALSE
     JOIN tbl_leave_types lt ON lt.id = lr.leave_type_id
     WHERE ${clause}
     ORDER BY lr.applied_on DESC`,
    values
  );
  return rows;
}

async function searchEmployees(q) {
  const { rows } = await pool.query(
    `SELECT id, employee_id, name, job_title, sub_unit, location
     FROM tbl_appusers
     WHERE is_deleted = FALSE AND is_active = TRUE
       AND (name ILIKE $1 OR employee_id ILIKE $1)
     ORDER BY name
     LIMIT 10`,
    [`%${q}%`]
  );
  return rows;
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
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeavesSummaryForExport,
  getLeavesDetailForExport,
  searchEmployees,
};
