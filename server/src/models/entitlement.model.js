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

async function entitlementExists(employeeId, leaveTypeId, year) {
  const { rows } = await pool.query(
    `SELECT id FROM tbl_leave_entitlements
     WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3 AND is_deleted = FALSE`,
    [employeeId, leaveTypeId, year],
  );
  return rows.length > 0;
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
        // Entitlement already exists — add the new days on top so admin can
        // grant additional leave without being blocked.
        const entitlementId = rows[0].id;
        await client.query(
          `UPDATE tbl_leave_entitlements
             SET total_days = total_days + $1,
                 updated_at = NOW()
           WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
             AND is_deleted = FALSE`,
          [totalDays, empId, leaveTypeId, year],
        );
        // Track this addition in history
        await client.query(
          `INSERT INTO tbl_entitlement_history 
             (entitlement_id, employee_id, leave_type_id, year, days_added, comments, added_by, added_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            entitlementId,
            empId,
            leaveTypeId,
            year,
            totalDays,
            comments,
            createdBy,
          ],
        );
      } else {
        // Create new entitlement
        const { rows: newRows } = await client.query(
          `INSERT INTO tbl_leave_entitlements
             (employee_id, leave_type_id, year, total_days, used_days, carried_days, is_deleted)
           VALUES ($1, $2, $3, $4, 0, 0, FALSE)
           RETURNING id`,
          [empId, leaveTypeId, year, totalDays],
        );
        const entitlementId = newRows[0].id;
        // Track this initial creation in history
        await client.query(
          `INSERT INTO tbl_entitlement_history 
             (entitlement_id, employee_id, leave_type_id, year, days_added, comments, added_by, added_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            entitlementId,
            empId,
            leaveTypeId,
            year,
            totalDays,
            comments,
            createdBy,
          ],
        );
      }
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

/**
 * Reset used_days to 0 for every entitlement whose leave period has ended.
 * Financial year N = Apr 1 (N-1) → Mar 31 (N).
 * A row expires when today is after Mar 31 of that year.
 * Called automatically whenever entitlements are saved — no scheduler needed.
 */
async function resetExpiredEntitlements() {
  await pool.query(
    `UPDATE tbl_leave_entitlements
        SET used_days = 0,
            updated_at = NOW()
      WHERE is_deleted = FALSE
        AND used_days > 0
        AND (year::text || '-03-31')::date < CURRENT_DATE`,
  );
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
              lt.name AS leave_type_name, lt.id AS leave_type_id,
              e.created_at AS credited_on,
              e.updated_at,
              MAKE_DATE(e.year - 1, 4, 1) AS valid_from,
              MAKE_DATE(e.year, 3, 31) AS valid_to,
              CASE WHEN CURRENT_DATE > MAKE_DATE(e.year, 3, 31) THEN true ELSE false END AS expired,
              COALESCE((SELECT days_added FROM tbl_entitlement_history 
               WHERE entitlement_id = e.id 
               ORDER BY added_at DESC 
               LIMIT 1), e.total_days) AS last_added_days
       FROM tbl_leave_entitlements e
       JOIN tbl_appusers u ON u.id = e.employee_id
       JOIN tbl_leave_types lt ON lt.id = e.leave_type_id
       WHERE ${clause}
       ORDER BY e.created_at DESC, e.id DESC
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
  resetExpiredEntitlements,
  findMyEntitlements,
  findEntitlements,
};
