import pool from "../config/db.js";
import { success, created } from "../utils/response.js";
import AppError from "../utils/AppError.js";
import { writeAuditLog } from "../services/audit.service.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendWelcomeEmail } from "../../email.service.js";
import {
  ROLES,
  ADMIN_ROLES,
  BASIC_SUPERVISOR_ROLES,
} from "../constants/roles.js";

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

function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const all = `${upper}${lower}${digits}${special}`;
  const chars = [upper, lower, digits, special].map(
    (set) => set[crypto.randomInt(set.length)],
  );
  while (chars.length < 12) chars.push(all[crypto.randomInt(all.length)]);
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }
  return chars.join("");
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

    const adminRolesLiteral = ADMIN_ROLES.map((role) => `'${role}'`).join(", ");

    const { rows: userRows } = await pool.query(
      `SELECT id, username, name, email, role, status, is_active
       FROM tbl_appusers
       WHERE is_deleted = false AND role IN (${adminRolesLiteral})
       ${searchFilter}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      queryParams,
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total_count
       FROM tbl_appusers
       WHERE is_deleted = false AND role IN (${adminRolesLiteral})
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

    if (!ADMIN_ROLES.includes(role)) {
      return next(
        new AppError(
          `Invalid role. Must be ${ROLES.HR_ADMIN} or ${ROLES.EMP_MANAGER}`,
          400,
        ),
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
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const isActive = status === "Enabled";
    const createdBy = req.user?.id || null;

    const { rows } = await pool.query(
      `INSERT INTO tbl_appusers
         (name, username, email, password, role, status, must_change_password, is_active, is_deleted, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, 'Active', true, $6, false, $7, $7)
       RETURNING id, username, name, email, role, status, is_active`,
      [employee_name, username, email, passwordHash, role, isActive, createdBy],
    );

    await writeAuditLog({
      employeeId: rows[0].id,
      employeeName: rows[0].name,
      employeeUsername: rows[0].username,
      section: rows[0].role,
      action: "CREATE",
      actor: req.user,
      actionDescription: `User created: ${rows[0].name} (${rows[0].email})`,
    });

    let emailSent = true;
    let emailMessage = "Welcome email sent successfully.";
    try {
      await sendWelcomeEmail({
        to: rows[0].email,
        name: rows[0].name,
        username: rows[0].username,
        password: temporaryPassword,
      });
    } catch {
      emailSent = false;
      emailMessage =
        "User created, but welcome email could not be sent. Check SMTP configuration.";
    }

    return created(res, { ...rows[0], emailSent, emailMessage });
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

    if (!ADMIN_ROLES.includes(role)) {
      return next(
        new AppError(
          `Invalid role. Must be ${ROLES.HR_ADMIN} or ${ROLES.EMP_MANAGER}`,
          400,
        ),
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

    const updatedRow = result.rows[0];
    await writeAuditLog({
      employeeId: updatedRow.id,
      employeeName: updatedRow.name,
      employeeUsername: updatedRow.username,
      section: updatedRow.role,
      action: "UPDATE",
      actor: req.user,
      actionDescription: `User updated: ${updatedRow.name} (${updatedRow.email})`,
    });

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const deletedBy = req.user?.id || null;

    const { rows: userRows } = await pool.query(
      `SELECT name, username, role, email FROM tbl_appusers WHERE id = $1 AND is_deleted = false`,
      [userId],
    );

    const result = await pool.query(
      `UPDATE tbl_appusers
       SET 
         is_deleted = TRUE,
         is_active = FALSE,
         termination_date = CURRENT_DATE,
         last_working_day = CURRENT_DATE,
         termination_reason = 'User Account Deleted by HR Admin',
         termination_type = 'Involuntary',
         notice_period_days = 0,
         exit_interview_completed = FALSE,
         rehire_eligible = FALSE,
         termination_notes = 'User account deleted through HR Administration',
         terminated_by_user_id = $1,
         updated_by = $1,
         updated_at = NOW()
       WHERE id = $2 AND is_deleted = FALSE`,
      [deletedBy, userId],
    );

    if (result.rowCount === 0) {
      return next(new AppError("User not found", 404));
    }

    if (userRows.length > 0) {
      const u = userRows[0];
      await writeAuditLog({
        employeeId: userId,
        employeeName: u.name,
        employeeUsername: u.username,
        section: u.role,
        action: "TERMINATE",
        actor: req.user,
        actionDescription: `User terminated: ${u.name} (${u.email})`,
      });
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

    const { rows: current } = await pool.query(
      `SELECT title FROM tbl_job_titles WHERE id = $1`,
      [jobTitleId],
    );
    if (current.length === 0) {
      return next(new AppError("Job title not found", 404));
    }
    const oldTitle = current[0].title;
    const newTitle = title.trim();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE tbl_job_titles
         SET title = $1, description = $2, is_active = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, title, description, is_active`,
        [
          newTitle,
          description?.trim() || null,
          is_active !== undefined ? Boolean(is_active) : true,
          jobTitleId,
        ],
      );

      if (oldTitle !== newTitle) {
        await client.query(
          `UPDATE tbl_appusers
           SET job_title = $1, updated_at = NOW()
           WHERE LOWER(TRIM(COALESCE(job_title, ''))) = LOWER(TRIM($2))
             AND is_deleted = false`,
          [newTitle, oldTitle],
        );
      }

      await client.query("COMMIT");
      return success(res, result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

const deleteJobTitle = async (req, res, next) => {
  try {
    const jobTitleId = parseInt(req.params.id, 10);

    const { rows: existing } = await pool.query(
      `SELECT title FROM tbl_job_titles WHERE id = $1`,
      [jobTitleId],
    );
    if (existing.length === 0) {
      return next(new AppError("Job title not found", 404));
    }
    const titleToRemove = existing[0].title;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(`DELETE FROM tbl_job_titles WHERE id = $1`, [
        jobTitleId,
      ]);

      await client.query(
        `UPDATE tbl_appusers
         SET job_title = NULL, updated_at = NOW()
         WHERE LOWER(TRIM(COALESCE(job_title, ''))) = LOWER(TRIM($1))
           AND is_deleted = false`,
        [titleToRemove],
      );

      await client.query("COMMIT");
      return success(res, { message: "Job title deleted successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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

    const { rows: current } = await pool.query(
      `SELECT category FROM tbl_job_categories WHERE id = $1`,
      [jobCategoryId],
    );
    if (current.length === 0) {
      return next(new AppError("Job category not found", 404));
    }
    const oldCategory = current[0].category;
    const newCategory = category.trim();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE tbl_job_categories
         SET category = $1, description = $2, is_active = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING id, category, description, is_active`,
        [
          newCategory,
          description?.trim() || null,
          is_active !== undefined ? Boolean(is_active) : true,
          jobCategoryId,
        ],
      );

      if (oldCategory !== newCategory) {
        await client.query(
          `UPDATE tbl_appusers
           SET job_category = $1, updated_at = NOW()
           WHERE LOWER(TRIM(COALESCE(job_category, ''))) = LOWER(TRIM($2))
             AND is_deleted = false`,
          [newCategory, oldCategory],
        );
      }

      await client.query("COMMIT");
      return success(res, result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

const deleteJobCategory = async (req, res, next) => {
  try {
    const jobCategoryId = parseInt(req.params.id, 10);

    const { rows: existing } = await pool.query(
      `SELECT category FROM tbl_job_categories WHERE id = $1`,
      [jobCategoryId],
    );
    if (existing.length === 0) {
      return next(new AppError("Job category not found", 404));
    }
    const categoryToRemove = existing[0].category;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(`DELETE FROM tbl_job_categories WHERE id = $1`, [
        jobCategoryId,
      ]);

      await client.query(
        `UPDATE tbl_appusers
         SET job_category = NULL, updated_at = NOW()
         WHERE LOWER(TRIM(COALESCE(job_category, ''))) = LOWER(TRIM($1))
           AND is_deleted = false`,
        [categoryToRemove],
      );

      await client.query("COMMIT");
      return success(res, { message: "Job category deleted successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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

    const { rows: current } = await pool.query(
      `SELECT sub_unit_name FROM tbl_sub_units WHERE id = $1`,
      [subUnitId],
    );
    if (current.length === 0) {
      return next(new AppError("Sub unit not found", 404));
    }
    const oldName = current[0].sub_unit_name;
    const newName = sub_unit_name.trim();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE tbl_sub_units
         SET sub_unit_name = $1, supervisor_name = $2, description = $3,
             is_active = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING id, sub_unit_name, supervisor_name, description, is_active`,
        [
          newName,
          supervisor_name?.trim() || null,
          description?.trim() || null,
          is_active !== undefined ? Boolean(is_active) : true,
          subUnitId,
        ],
      );

      if (oldName !== newName) {
        await client.query(
          `UPDATE tbl_appusers
           SET sub_unit = $1, updated_at = NOW()
           WHERE LOWER(TRIM(COALESCE(sub_unit, ''))) = LOWER(TRIM($2))
             AND is_deleted = false`,
          [newName, oldName],
        );
      }

      await client.query("COMMIT");
      return success(res, result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

const deleteSubUnit = async (req, res, next) => {
  try {
    const subUnitId = parseInt(req.params.id, 10);

    const { rows: existing } = await pool.query(
      `SELECT sub_unit_name FROM tbl_sub_units WHERE id = $1`,
      [subUnitId],
    );
    if (existing.length === 0) {
      return next(new AppError("Sub unit not found", 404));
    }
    const nameToRemove = existing[0].sub_unit_name;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(`DELETE FROM tbl_sub_units WHERE id = $1`, [
        subUnitId,
      ]);

      await client.query(
        `UPDATE tbl_appusers
         SET sub_unit = NULL, updated_at = NOW()
         WHERE LOWER(TRIM(COALESCE(sub_unit, ''))) = LOWER(TRIM($1))
           AND is_deleted = false`,
        [nameToRemove],
      );

      await client.query("COMMIT");
      return success(res, { message: "Sub unit deleted successfully" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

const getRoleAccess = async (req, res, next) => {
  try {
    const currentPage = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit || "10", 10)),
    );
    const searchTerm = (req.query.search || "").trim();
    const roleFilter = (req.query.role || "").trim();
    const genderFilter = (req.query.gender || "").trim();
    const statusFilter = (req.query.status || "").trim();
    const offset = (currentPage - 1) * pageSize;

    const conditions = ["u.is_deleted = false"];
    const params = [];

    if (searchTerm) {
      params.push(`%${searchTerm}%`);
      const p = params.length;
      conditions.push(
        `(u.name ILIKE $${p} OR u.username ILIKE $${p} OR u.email ILIKE $${p} OR u.employee_id ILIKE $${p})`,
      );
    }
    if (roleFilter) {
      if (roleFilter === ROLES.SUPERVISOR) {
        const supervisorRolesLiteral = BASIC_SUPERVISOR_ROLES.map(
          (role) => `'${role}'`,
        ).join(", ");
        conditions.push(`u.role IN (${supervisorRolesLiteral})`);
      } else if (roleFilter === ROLES.HR_ADMIN) {
        const adminRolesLiteral = ADMIN_ROLES.map((role) => `'${role}'`).join(
          ", ",
        );
        conditions.push(`u.role IN (${adminRolesLiteral})`);
      } else {
        params.push(roleFilter);
        conditions.push(`u.role = $${params.length}`);
      }
    }
    if (genderFilter) {
      params.push(genderFilter);
      conditions.push(`u.gender = $${params.length}`);
    }
    if (statusFilter) {
      if (statusFilter === "active") {
        conditions.push("u.is_active = true");
      }
      if (statusFilter === "inactive") {
        conditions.push("u.is_active = false");
      }
    }

    const where = conditions.join(" AND ");

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM tbl_appusers u WHERE ${where}`,
      params,
    );
    const totalRecords = countRows[0].total;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

    const dataParams = [...params, pageSize, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const { rows } = await pool.query(
      `SELECT
         u.id,
         u.employee_id,
         u.name,
         u.username,
         u.email,
         u.role,
         u.gender,
         u.avatar,
         u.is_active,
         u.status
       FROM tbl_appusers u
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      dataParams,
    );

    return success(res, {
      users: rows,
      total: totalRecords,
      page: currentPage,
      totalPages,
      limit: pageSize,
    });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { role } = req.body;

    const allowedRoles = [ROLES.EMPLOYEE, ROLES.SUPERVISOR, ROLES.HR_ADMIN];
    if (!role || !allowedRoles.includes(role)) {
      return next(
        new AppError(
          `Invalid role. Must be ${allowedRoles.join(", ")}`,
          400,
        ),
      );
    }

    const result = await pool.query(
      `UPDATE tbl_appusers SET role = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3 AND is_deleted = false
       RETURNING id, name, username, email, role, is_active`,
      [role, req.user?.id || null, userId],
    );

    if (result.rowCount === 0) {
      return next(new AppError("User not found", 404));
    }

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const getAuditTrail = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { rows: tableCheck } = await pool.query(
      `SELECT to_regclass('public.tbl_audit_log') AS tbl`,
    );
    const auditTableExists = tableCheck[0]?.tbl !== null;

    let rows = [];
    let totalCount = 0;

    if (auditTableExists) {
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*)::int AS total FROM tbl_audit_log`,
      );
      totalCount = countRows[0]?.total || 0;

      const { rows: logRows } = await pool.query(
        `SELECT
           al.id::bigint                        AS id,
           al.employee_id::bigint               AS employee_id,
           (SELECT emp.employee_id FROM tbl_appusers emp WHERE emp.id = al.employee_id LIMIT 1) AS employee_code,
           COALESCE(al.employee_name, '—')      AS employee,
           COALESCE(al.employee_username, '')   AS employee_username,
           COALESCE(al.section, '')             AS section,
           al.action,
           COALESCE(al.actor_name, 'System')    AS action_owner,
           COALESCE(al.actor_username, '')      AS action_owner_username,
           actor.avatar                         AS action_owner_avatar,
           COALESCE(al.source, 'Web Application')             AS source,
           COALESCE(al.performed_screen, 'HR Administration') AS performed_screen,
           COALESCE(al.action_description, '')  AS action_description,
           CASE 
             WHEN al.action = 'TERMINATE' THEN COALESCE(term.termination_notes, emp.note, '')
             ELSE COALESCE(emp.note, '')
           END AS notes,
           al.event_time,
           al.created_at
         FROM tbl_audit_log al
         LEFT JOIN tbl_appusers emp
                ON al.employee_id IS NOT NULL
               AND emp.id = al.employee_id
         LEFT JOIN tbl_employee_terminations term
                ON term.employee_id = al.employee_id
         LEFT JOIN tbl_appusers actor
                ON actor.id = al.actor_id
         ORDER BY al.event_time DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      rows = logRows;
    }

    const { rows: derivedCountRows } = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM tbl_appusers) + 
        (SELECT COUNT(*) FROM tbl_appusers WHERE updated_at IS NOT NULL AND updated_at::timestamptz > (created_at::timestamptz + interval '1 second') AND is_deleted = false) +
        (SELECT COUNT(*) FROM tbl_appusers WHERE is_deleted = true) AS total`,
    );
    const derivedTotalCount = derivedCountRows[0]?.total || 0;

    const { rows: derivedRows } = await pool.query(
      `
      -- CREATE events: every user/employee has at least one
      SELECT
        (emp.id * 10 + 1)::bigint                    AS id,
        emp.id::bigint                                AS employee_id,
        COALESCE(emp.employee_id, '')                 AS employee_code,
        COALESCE(emp.name, emp.username, '—')         AS employee,
        COALESCE(emp.username, '')                    AS employee_username,
        COALESCE(emp.role, '')                        AS section,
        'CREATE'                                      AS action,
        CASE
          WHEN emp.created_by = '0' OR emp.created_by IS NULL THEN 'Admin'
          ELSE COALESCE(actor_cre.name, actor_cre.username, 'System')
        END                                           AS action_owner,
        CASE
          WHEN emp.created_by = '0' OR emp.created_by IS NULL THEN 'admin'
          ELSE COALESCE(actor_cre.username, '')
        END                                           AS action_owner_username,
        CASE
          WHEN emp.created_by = '0' OR emp.created_by IS NULL THEN NULL
          ELSE actor_cre.avatar
        END                                           AS action_owner_avatar,
        'Web Application'                             AS source,
        'HR Administration'                           AS performed_screen,
        'Record created by ' ||
          CASE
            WHEN emp.created_by = '0' OR emp.created_by IS NULL THEN 'Admin'
            ELSE COALESCE(actor_cre.name, actor_cre.username, 'System')
          END                                         AS action_description,
        COALESCE(emp.note, '')                        AS notes,
        emp.created_at                                AS event_time,
        emp.created_at
      FROM tbl_appusers emp
      LEFT JOIN tbl_appusers actor_cre
             ON emp.created_by IS NOT NULL
            AND emp.created_by::text ~ '^[1-9][0-9]*$'
            AND actor_cre.id::text = emp.created_by::text
            AND actor_cre.is_deleted = false

      UNION ALL

      -- UPDATE events: only for users updated AFTER creation
      SELECT
        (emp.id * 10 + 2)::bigint                    AS id,
        emp.id::bigint                                AS employee_id,
        COALESCE(emp.employee_id, '')                 AS employee_code,
        COALESCE(emp.name, emp.username, '—')         AS employee,
        COALESCE(emp.username, '')                    AS employee_username,
        COALESCE(emp.role, '')                        AS section,
        'UPDATE'                                      AS action,
        CASE
          WHEN emp.updated_by = '0' OR emp.updated_by IS NULL THEN 'Admin'
          ELSE COALESCE(actor_upd.name, actor_upd.username, 'System')
        END                                           AS action_owner,
        CASE
          WHEN emp.updated_by = '0' OR emp.updated_by IS NULL THEN 'admin'
          ELSE COALESCE(actor_upd.username, '')
        END                                           AS action_owner_username,
        CASE
          WHEN emp.updated_by = '0' OR emp.updated_by IS NULL THEN NULL
          ELSE actor_upd.avatar
        END                                           AS action_owner_avatar,
        'Web Application'                             AS source,
        'HR Administration'                           AS performed_screen,
        'Record updated by ' ||
          CASE
            WHEN emp.updated_by = '0' OR emp.updated_by IS NULL THEN 'Admin'
            ELSE COALESCE(actor_upd.name, actor_upd.username, 'System')
          END                                         AS action_description,
        COALESCE(emp.note, '')                        AS notes,
        emp.updated_at                                AS event_time,
        emp.updated_at                                AS created_at
      FROM tbl_appusers emp
      LEFT JOIN tbl_appusers actor_upd
             ON emp.updated_by IS NOT NULL
            AND emp.updated_by::text ~ '^[1-9][0-9]*$'
            AND actor_upd.id::text = emp.updated_by::text
            AND actor_upd.is_deleted = false
      WHERE emp.updated_at IS NOT NULL
        AND emp.updated_at::timestamptz > (emp.created_at::timestamptz + interval '1 second')
        AND emp.is_deleted = false

      UNION ALL

      -- TERMINATE events: soft-deleted users
      SELECT
        (emp.id * 10 + 3)::bigint                    AS id,
        emp.id::bigint                                AS employee_id,
        COALESCE(emp.employee_id, '')                 AS employee_code,
        COALESCE(emp.name, emp.username, '—')         AS employee,
        COALESCE(emp.username, '')                    AS employee_username,
        COALESCE(emp.role, '')                        AS section,
        'TERMINATE'                                   AS action,
        CASE
          WHEN emp.updated_by = '0' OR emp.updated_by IS NULL THEN 'Admin'
          ELSE COALESCE(actor_del.name, actor_del.username, 'System')
        END                                           AS action_owner,
        CASE
          WHEN emp.updated_by = '0' OR emp.updated_by IS NULL THEN 'admin'
          ELSE COALESCE(actor_del.username, '')
        END                                           AS action_owner_username,
        CASE
          WHEN emp.updated_by = '0' OR emp.updated_by IS NULL THEN NULL
          ELSE actor_del.avatar
        END                                           AS action_owner_avatar,
        'Web Application'                             AS source,
        'HR Administration'                           AS performed_screen,
        'Record terminated by ' ||
          CASE
            WHEN emp.updated_by = '0' OR emp.updated_by IS NULL THEN 'Admin'
            ELSE COALESCE(actor_del.name, actor_del.username, 'System')
          END                                         AS action_description,
        COALESCE(emp.note, '')                        AS notes,
        COALESCE(emp.updated_at, emp.created_at)      AS event_time,
        COALESCE(emp.updated_at, emp.created_at)      AS created_at
      FROM tbl_appusers emp
      LEFT JOIN tbl_appusers actor_del
             ON emp.updated_by IS NOT NULL
            AND emp.updated_by::text ~ '^[1-9][0-9]*$'
            AND actor_del.id::text = emp.updated_by::text
            AND actor_del.is_deleted = false
      WHERE emp.is_deleted = true

      ORDER BY event_time DESC NULLS LAST
      LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    let finalRows;
    let finalTotalCount = totalCount + derivedTotalCount;

    if (auditTableExists && rows.length > 0) {
      const loggedUsernames = new Set(rows.map((r) => r.employee_username));
      const gap = derivedRows.filter(
        (r) => !loggedUsernames.has(r.employee_username),
      );
      finalRows = [...rows, ...gap].sort(
        (a, b) =>
          new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
      );
    } else {
      finalRows = derivedRows;
    }

    return success(res, {
      data: finalRows,
      pagination: {
        page,
        limit,
        totalCount: finalTotalCount,
        totalPages: Math.ceil(finalTotalCount / limit),
      },
    });
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
  getRoleAccess,
  updateUserRole,
  getAuditTrail,
};
