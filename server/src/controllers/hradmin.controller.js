import pool from "../config/db.js";
import { success, created } from "../utils/response.js";
import AppError from "../utils/AppError.js";

const SPACE_REGEX = /\s+/g;
const INVALID_CHAR_REGEX = /[^a-z0-9_]/g;
const TRIM_UNDERSCORE_REGEX = /^_+|_+$/g;

async function generateUniqueUsername(email, fullName) {
  let base = fullName
    ? fullName
        .toLowerCase()
        .replace(SPACE_REGEX, "_")
        .replace(INVALID_CHAR_REGEX, "")
    : email.split("@")[0];
  base = base.replace(TRIM_UNDERSCORE_REGEX, "") || email.split("@")[0];

  let username = base;
  let counter = 1;
  while (true) {
    const { rows } = await pool.query(
      "SELECT id FROM tbl_appusers WHERE username = $1",
      [username],
    );
    if (rows.length === 0) break;
    username = `${base}_${counter++}`;
  }
  return username;
}

const getUsers = async (req, res, next) => {
  try {
    const currentPage = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit || "10", 10)),
    );
    const searchTerm = (req.query.search || "").trim();
    const rowOffset = (currentPage - 1) * pageSize;

    const searchFilter = searchTerm
      ? `AND (name ILIKE $3 OR username ILIKE $3 OR email ILIKE $3)`
      : "";

    const queryParams = searchTerm
      ? [pageSize, rowOffset, `%${searchTerm}%`]
      : [pageSize, rowOffset];

    const countParams = searchTerm ? [`%${searchTerm}%`] : [];
    const countPlaceholder = searchTerm
      ? "AND (name ILIKE $1 OR username ILIKE $1 OR email ILIKE $1)"
      : "";

    const { rows: userRows } = await pool.query(
      `SELECT id, username, name, email, role, status, is_active
       FROM tbl_appusers
       WHERE is_deleted = false AND role IN ('hradmin', 'empmanager')
       ${searchFilter}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      queryParams,
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total_count
       FROM tbl_appusers
       WHERE is_deleted = false AND role IN ('hradmin', 'empmanager')
       ${countPlaceholder}`,
      countParams,
    );

    const totalRecords = countRows[0].total_count;
    const totalPages = Math.ceil(totalRecords / pageSize);

    return success(res, {
      users: userRows,
      total: totalRecords,
      page: currentPage,
      totalPages,
      limit: pageSize,
    });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { employee_name, email, role, status } = req.body;

    if (!employee_name || !email || !role) {
      return next(
        new AppError("employee_name, email, and role are required", 400),
      );
    }

    const allowedRoles = ["hradmin", "empmanager"];
    if (!allowedRoles.includes(role)) {
      return next(
        new AppError("Invalid role. Must be hradmin or empmanager", 400),
      );
    }

    const { rows: existing } = await pool.query(
      "SELECT id FROM tbl_appusers WHERE email = $1 AND is_deleted = false",
      [email],
    );
    if (existing.length > 0) {
      return next(new AppError("A user with this email already exists", 409));
    }

    const username = await generateUniqueUsername(email, employee_name);
    const isActive = status === "Enabled";
    const createdBy = req.user?.id || null;

    const { rows } = await pool.query(
      `INSERT INTO tbl_appusers
         (name, username, email, password, role, status, is_active, is_deleted, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, 'Active', $6, false, $7, $7)
       RETURNING id, username, name, email, role, status, is_active`,
      [
        employee_name,
        username,
        email,
        Math.random().toString(36).slice(2) + "Aa1!", // temporary password
        role,
        isActive,
        createdBy,
      ],
    );

    return created(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { employee_name, email, role, status } = req.body;

    if (!employee_name || !email || !role) {
      return next(
        new AppError("employee_name, email, and role are required", 400),
      );
    }

    const allowedRoles = ["hradmin", "empmanager"];
    if (!allowedRoles.includes(role)) {
      return next(
        new AppError("Invalid role. Must be hradmin or empmanager", 400),
      );
    }

    const { rows: conflict } = await pool.query(
      "SELECT id FROM tbl_appusers WHERE email = $1 AND id <> $2 AND is_deleted = false",
      [email, userId],
    );
    if (conflict.length > 0) {
      return next(
        new AppError("Another user with this email already exists", 409),
      );
    }

    const isActive = status === "Enabled";
    const updatedBy = req.user?.id || null;

    const result = await pool.query(
      `UPDATE tbl_appusers
       SET name = $1, email = $2, role = $3, is_active = $4,
           updated_by = $5, updated_at = NOW()
       WHERE id = $6 AND is_deleted = false
       RETURNING id, username, name, email, role, status, is_active`,
      [employee_name, email, role, isActive, updatedBy, userId],
    );

    if (result.rowCount === 0) {
      return next(new AppError("User not found", 404));
    }

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const deletedBy = req.user?.id || null;

    const result = await pool.query(
      `UPDATE tbl_appusers
       SET is_deleted = true, updated_by = $1, updated_at = NOW()
       WHERE id = $2 AND is_deleted = false`,
      [deletedBy, userId],
    );

    if (result.rowCount === 0) {
      return next(new AppError("User not found", 404));
    }

    return success(res, { message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const updatedBy = req.user?.id || null;

    const { rows: current } = await pool.query(
      "SELECT is_active FROM tbl_appusers WHERE id = $1 AND is_deleted = false",
      [userId],
    );

    if (current.length === 0) {
      return next(new AppError("User not found", 404));
    }

    const newStatus = !current[0].is_active;

    await pool.query(
      `UPDATE tbl_appusers SET is_active = $1, updated_by = $2, updated_at = NOW() WHERE id = $3`,
      [newStatus, updatedBy, userId],
    );

    return success(res, { id: userId, is_active: newStatus });
  } catch (err) {
    next(err);
  }
};

const getJobTitles = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, is_active
       FROM tbl_job_titles
       WHERE is_active = true
       ORDER BY title ASC`,
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

const createJobTitle = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return next(new AppError("title is required", 400));
    }

    const { rows: duplicate } = await pool.query(
      `SELECT id FROM tbl_job_titles WHERE LOWER(TRIM(title)) = LOWER(TRIM($1))`,
      [title],
    );
    if (duplicate.length > 0) {
      return next(
        new AppError("A job title with this name already exists", 409),
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO tbl_job_titles (title, description, is_active)
       VALUES ($1, $2, true)
       RETURNING id, title, description, is_active`,
      [title.trim(), description?.trim() || null],
    );

    return created(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateJobTitle = async (req, res, next) => {
  try {
    const jobTitleId = parseInt(req.params.id, 10);
    const { title, description, is_active } = req.body;

    if (!title || !title.trim()) {
      return next(new AppError("title is required", 400));
    }

    const { rows: duplicate } = await pool.query(
      `SELECT id FROM tbl_job_titles
       WHERE LOWER(TRIM(title)) = LOWER(TRIM($1)) AND id <> $2`,
      [title, jobTitleId],
    );
    if (duplicate.length > 0) {
      return next(
        new AppError("Another job title with this name already exists", 409),
      );
    }

    const result = await pool.query(
      `UPDATE tbl_job_titles
       SET title = $1, description = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, title, description, is_active`,
      [
        title.trim(),
        description?.trim() || null,
        is_active !== undefined ? Boolean(is_active) : true,
        jobTitleId,
      ],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Job title not found", 404));
    }

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteJobTitle = async (req, res, next) => {
  try {
    const jobTitleId = parseInt(req.params.id, 10);

    const result = await pool.query(
      `DELETE FROM tbl_job_titles WHERE id = $1`,
      [jobTitleId],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Job title not found", 404));
    }

    return success(res, { message: "Job title deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const getJobCategories = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, category, description, is_active
       FROM tbl_job_categories
       WHERE is_active = true
       ORDER BY category ASC`,
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

const createJobCategory = async (req, res, next) => {
  try {
    const { category, description } = req.body;

    if (!category || !category.trim()) {
      return next(new AppError("category is required", 400));
    }

    const { rows: duplicate } = await pool.query(
      `SELECT id FROM tbl_job_categories WHERE LOWER(TRIM(category)) = LOWER(TRIM($1))`,
      [category],
    );
    if (duplicate.length > 0) {
      return next(
        new AppError("A job category with this name already exists", 409),
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO tbl_job_categories (category, description, is_active)
       VALUES ($1, $2, true)
       RETURNING id, category, description, is_active`,
      [category.trim(), description?.trim() || null],
    );

    return created(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateJobCategory = async (req, res, next) => {
  try {
    const jobCategoryId = parseInt(req.params.id, 10);
    const { category, description, is_active } = req.body;

    if (!category || !category.trim()) {
      return next(new AppError("category is required", 400));
    }

    const { rows: duplicate } = await pool.query(
      `SELECT id FROM tbl_job_categories
       WHERE LOWER(TRIM(category)) = LOWER(TRIM($1)) AND id <> $2`,
      [category, jobCategoryId],
    );
    if (duplicate.length > 0) {
      return next(
        new AppError("Another job category with this name already exists", 409),
      );
    }

    const result = await pool.query(
      `UPDATE tbl_job_categories
       SET category = $1, description = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, category, description, is_active`,
      [
        category.trim(),
        description?.trim() || null,
        is_active !== undefined ? Boolean(is_active) : true,
        jobCategoryId,
      ],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Job category not found", 404));
    }

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteJobCategory = async (req, res, next) => {
  try {
    const jobCategoryId = parseInt(req.params.id, 10);

    const result = await pool.query(
      `DELETE FROM tbl_job_categories WHERE id = $1`,
      [jobCategoryId],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Job category not found", 404));
    }

    return success(res, { message: "Job category deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const getSubUnits = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, sub_unit_name, supervisor_name, description, is_active
       FROM tbl_sub_units
       ORDER BY sub_unit_name ASC`,
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

const createSubUnit = async (req, res, next) => {
  try {
    const { sub_unit_name, supervisor_name, description } = req.body;

    if (!sub_unit_name || !sub_unit_name.trim()) {
      return next(new AppError("sub_unit_name is required", 400));
    }

    const { rows: duplicate } = await pool.query(
      `SELECT id FROM tbl_sub_units WHERE LOWER(TRIM(sub_unit_name)) = LOWER(TRIM($1))`,
      [sub_unit_name],
    );
    if (duplicate.length > 0) {
      return next(
        new AppError("A sub unit with this name already exists", 409),
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO tbl_sub_units (sub_unit_name, supervisor_name, description, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, sub_unit_name, supervisor_name, description, is_active`,
      [
        sub_unit_name.trim(),
        supervisor_name?.trim() || null,
        description?.trim() || null,
      ],
    );

    return created(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

const updateSubUnit = async (req, res, next) => {
  try {
    const subUnitId = parseInt(req.params.id, 10);
    const { sub_unit_name, supervisor_name, description, is_active } = req.body;

    if (!sub_unit_name || !sub_unit_name.trim()) {
      return next(new AppError("sub_unit_name is required", 400));
    }

    const { rows: duplicate } = await pool.query(
      `SELECT id FROM tbl_sub_units
       WHERE LOWER(TRIM(sub_unit_name)) = LOWER(TRIM($1)) AND id <> $2`,
      [sub_unit_name, subUnitId],
    );
    if (duplicate.length > 0) {
      return next(
        new AppError("Another sub unit with this name already exists", 409),
      );
    }

    const result = await pool.query(
      `UPDATE tbl_sub_units
       SET sub_unit_name = $1, supervisor_name = $2, description = $3,
           is_active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, sub_unit_name, supervisor_name, description, is_active`,
      [
        sub_unit_name.trim(),
        supervisor_name?.trim() || null,
        description?.trim() || null,
        is_active !== undefined ? Boolean(is_active) : true,
        subUnitId,
      ],
    );

    if (result.rowCount === 0) {
      return next(new AppError("Sub unit not found", 404));
    }

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteSubUnit = async (req, res, next) => {
  try {
    const subUnitId = parseInt(req.params.id, 10);

    const result = await pool.query(`DELETE FROM tbl_sub_units WHERE id = $1`, [
      subUnitId,
    ]);

    if (result.rowCount === 0) {
      return next(new AppError("Sub unit not found", 404));
    }

    return success(res, { message: "Sub unit deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const getAuditTrail = async (req, res, next) => {
  try {
    const currentUser = req.user || {};
    const currentUserName =
      currentUser.id === 0
        ? "Admin"
        : currentUser.name || currentUser.username || "Unknown";
    const currentUserUsername = currentUser.username || "admin";

    const { rows } = await pool.query(
      `SELECT
         emp.id,
         COALESCE(emp.name, emp.username)   AS employee,
         emp.username                       AS employee_username,
         emp.role                           AS section,
         CASE
           WHEN emp.updated_at IS NOT NULL
                AND emp.updated_at::timestamptz > emp.created_at::timestamptz
             THEN 'UPDATE'
           ELSE 'CREATE'
         END                               AS action,
         COALESCE(emp.updated_by, emp.created_by) AS actor_id_raw,
         emp.created_at,
         emp.updated_at,
         COALESCE(emp.updated_at, emp.created_at) AS event_time,
         -- Resolve actor name via safe JOIN (only for non-zero numeric ids)
         CASE
           WHEN emp.updated_at IS NOT NULL
                AND emp.updated_at::timestamptz > emp.created_at::timestamptz
           THEN COALESCE(actor_upd.name, actor_upd.username)
           ELSE COALESCE(actor_cre.name, actor_cre.username)
         END AS resolved_actor_name,
         CASE
           WHEN emp.updated_at IS NOT NULL
                AND emp.updated_at::timestamptz > emp.created_at::timestamptz
           THEN actor_upd.username
           ELSE actor_cre.username
         END AS resolved_actor_username
       FROM tbl_appusers emp
       LEFT JOIN tbl_appusers actor_cre
              ON emp.created_by IS NOT NULL
             AND emp.created_by ~ '^[1-9][0-9]*$'
             AND actor_cre.id = emp.created_by::bigint
             AND actor_cre.is_deleted = false
       LEFT JOIN tbl_appusers actor_upd
              ON emp.updated_by IS NOT NULL
             AND emp.updated_by ~ '^[1-9][0-9]*$'
             AND actor_upd.id = emp.updated_by::bigint
             AND actor_upd.is_deleted = false
       WHERE emp.is_deleted = false
       ORDER BY COALESCE(emp.updated_at, emp.created_at) DESC NULLS LAST
       LIMIT 100`,
    );

    const finalRows = rows.map((row) => {
     
      const isAdminActor =
        !row.actor_id_raw || row.actor_id_raw === "0" || row.actor_id_raw === 0;

      const actionOwner = isAdminActor
        ? currentUserName
        : row.resolved_actor_name || currentUserName;

      const actionOwnerUsername = isAdminActor
        ? currentUserUsername
        : row.resolved_actor_username || currentUserUsername;

      const actionDescription =
        row.action === "UPDATE"
          ? `Record updated by ${actionOwner}`
          : `Record created by ${actionOwner}`;

      return {
        id: row.id,
        employee: row.employee,
        employee_username: row.employee_username,
        section: row.section,
        action: row.action,
        action_owner: actionOwner,
        action_owner_username: actionOwnerUsername,
        source: "Web Application",
        performed_screen: "HR Administration",
        action_description: actionDescription,
        event_time: row.event_time,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return success(res, finalRows);
  } catch (err) {
    next(err);
  }
};

export {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getJobTitles,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle,
  getJobCategories,
  createJobCategory,
  updateJobCategory,
  deleteJobCategory,
  getSubUnits,
  createSubUnit,
  updateSubUnit,
  deleteSubUnit,
  getAuditTrail,
};
