import pool from "../config/db.js";

async function findActiveEmployees(searchQuery = "") {
  const trimmed = searchQuery.trim();
  if (trimmed === "") {
    const { rows } = await pool.query(
      `SELECT id, employee_id, name, job_title, sub_unit, location
       FROM tbl_appusers
       WHERE is_deleted = FALSE AND is_active = TRUE
       ORDER BY name
       LIMIT 50`,
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT id, employee_id, name, job_title, sub_unit, location
     FROM tbl_appusers
     WHERE is_deleted = FALSE AND is_active = TRUE
       AND (name ILIKE $1 OR employee_id ILIKE $1)
     ORDER BY name
     LIMIT 50`,
    [`%${trimmed}%`],
  );
  return rows;
}

async function findActiveLeaveTypes() {
  const { rows } = await pool.query(
    `SELECT id, name, code, max_days, carry_forward
     FROM tbl_leave_types
     WHERE is_deleted = FALSE AND is_active = TRUE
     ORDER BY name`,
  );
  return rows;
}

async function createEntitlement({
  employee_id,
  leave_type_id,
  year,
  total_days,
  comments,
  created_by,
}) {
  const { rows } = await pool.query(
    `INSERT INTO tbl_leave_entitlements
       (employee_id, leave_type_id, year, total_days, used_days, carried_days, is_deleted)
     VALUES ($1, $2, $3, $4, 0, 0, FALSE)
     RETURNING id`,
    [employee_id, leave_type_id, year, total_days],
  );
  return rows[0];
}

async function bulkCreateEntitlements(
  employeeIds,
  leaveTypeId,
  year,
  totalDays,
  comments,
  createdBy,
) {
  const client = await pool.connect();
  const results = { created: [], skipped: [] };
  try {
    await client.query("BEGIN");
    for (const empId of employeeIds) {
      const { rows } = await client.query(
        `SELECT id FROM tbl_leave_entitlements
         WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3 AND is_deleted = FALSE`,
        [empId, leaveTypeId, year],
      );
      if (rows.length > 0) {
        results.skipped.push(empId);
        continue;
      }
      await client.query(
        `INSERT INTO tbl_leave_entitlements
           (employee_id, leave_type_id, year, total_days, used_days, carried_days, is_deleted)
         VALUES ($1, $2, $3, $4, 0, 0, FALSE)`,
        [empId, leaveTypeId, year, totalDays],
      );
      results.created.push(empId);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return results;
}

async function findMyEntitlements(employeeId) {
  const today = new Date().toISOString().split("T")[0];
  const { rows } = await pool.query(
    `SELECT
       e.id,
       lt.name                                    AS leave_type,
       'Added'                                    AS entitlement_type,
       e.created_at::date::text                   AS credited_on,
       -- Financial year valid_from: April 1 of (year-1)
       ((e.year - 1)::text || '-04-01')           AS valid_from,
       -- Financial year valid_to: March 31 of year
       (e.year::text || '-03-31')                 AS valid_to,
       (e.year::text || '-03-31') < $2            AS expired,
       e.total_days                               AS leave_entitlement,
       e.used_days,
       e.carried_days,
       (e.total_days + e.carried_days - e.used_days) AS net_balance,
       e.year
     FROM tbl_leave_entitlements e
     JOIN tbl_leave_types lt ON lt.id = e.leave_type_id
     WHERE e.employee_id = $1
       AND e.is_deleted = FALSE
     ORDER BY valid_from DESC`,
    [employeeId, today],
  );
  return rows;
}
async function findEntitlements({
  employee_id,
  leave_type_id,
  year,
  page = 1,
  limit = 20,
}) {
  const conditions = ["e.is_deleted = FALSE"];
  const values = [];
  let paramIndex = 1;

  if (employee_id) {
    conditions.push(`e.employee_id = $${paramIndex++}`);
    values.push(employee_id);
  }
  if (leave_type_id) {
    conditions.push(`e.leave_type_id = $${paramIndex++}`);
    values.push(leave_type_id);
  }
  if (year) {
    conditions.push(`e.year = $${paramIndex++}`);
    values.push(year);
  }

  const clause = conditions.join(" AND ");
  const offset = (page - 1) * limit;

  const [dataRes, countRes] = await Promise.all([
    pool.query(
      `SELECT e.id, e.year, e.total_days, e.used_days, e.carried_days,
              (e.total_days + e.carried_days - e.used_days) AS net_balance,
              u.employee_id AS emp_code, u.name AS employee_name,
              u.job_title, u.sub_unit,
              lt.name AS leave_type_name, lt.id AS leave_type_id
       FROM tbl_leave_entitlements e
       JOIN tbl_appusers u ON u.id = e.employee_id
       JOIN tbl_leave_types lt ON lt.id = e.leave_type_id
       WHERE ${clause}
       ORDER BY u.name, lt.name
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...values, limit, offset],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM tbl_leave_entitlements e
       JOIN tbl_appusers u ON u.id = e.employee_id
       JOIN tbl_leave_types lt ON lt.id = e.leave_type_id
       WHERE ${clause}`,
      values,
    ),
  ]);

  return {
    data: dataRes.rows,
    total: countRes.rows[0].total,
    page,
    totalPages: Math.ceil(countRes.rows[0].total / limit),
  };
}

export {
  findActiveEmployees,
  findActiveLeaveTypes,
  createEntitlement,
  bulkCreateEntitlements,
  findMyEntitlements,
  findEntitlements,
};
