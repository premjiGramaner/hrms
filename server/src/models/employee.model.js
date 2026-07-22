import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { logError } from "../utils/logger.js";
import crypto from "crypto";
import {
  ROLES,
  ADMIN_ROLES,
  BASIC_SUPERVISOR_ROLES,
} from "../constants/roles.js";

const toSqlList = (roles) => roles.map((role) => `'${role}'`).join(", ");
const ADMIN_ROLES_SQL = toSqlList(ADMIN_ROLES);
const BASIC_SUPERVISOR_ROLES_SQL = toSqlList(BASIC_SUPERVISOR_ROLES);
const SUPERIOR_ROLES_SQL = toSqlList([
  ...BASIC_SUPERVISOR_ROLES,
  ...ADMIN_ROLES,
]);

const SPACE_REGEX = /\s+/g;
const INVALID_CHAR_REGEX = /[^a-z0-9_]/g;
const TRIM_UNDERSCORE_REGEX = /^_+|_+$/g;

async function createUniqueUsername(email, name) {
  let base = name
    ? name
      .toLowerCase()
      .replace(SPACE_REGEX, "_")
      .replace(INVALID_CHAR_REGEX, "")
    : email.split("@")[0];
  base = base.replace(TRIM_UNDERSCORE_REGEX, "") || email.split("@")[0];

  let username = base;
  let counter = 1;
  while (true) {
    const { rows } = await pool.query(
      "SELECT id FROM tbl_appusers WHERE username=$1",
      [username],
    );
    if (rows.length === 0) break;
    username = `${base}_${counter++}`;
  }
  return username;
}

async function findAllEmployees(page, limit = 10, search = "") {
  const offset = (page - 1) * limit;
  const searchTerm = search.trim();

  const baseWhere = `u.is_deleted = false AND (u.employment_status IS NULL OR u.employment_status != 'Terminated') AND u.role NOT IN (${ADMIN_ROLES_SQL})`;

  const values = [];
  let whereClause = baseWhere;

  if (searchTerm) {
    values.push(searchTerm);
    const searchIndex = values.length;
    whereClause += `
      AND (
        u.employee_id::text ILIKE '%' || $${searchIndex}::text || '%'
        OR u.first_name::text ILIKE '%' || $${searchIndex}::text || '%'
        OR u.middle_name::text ILIKE '%' || $${searchIndex}::text || '%'
        OR u.last_name::text ILIKE '%' || $${searchIndex}::text || '%'
        OR u.name::text ILIKE '%' || $${searchIndex}::text || '%'
        OR u.username::text ILIKE '%' || $${searchIndex}::text || '%'
        OR u.email::text ILIKE '%' || $${searchIndex}::text || '%'
        OR CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)::text ILIKE '%' || $${searchIndex}::text || '%'
      )
    `;
  }

  values.push(limit);
  const limitIndex = values.length;

  values.push(offset);
  const offsetIndex = values.length;

  try {
    const { rows } = await pool.query(
      `SELECT u.id::int, u.employee_id, u.name, u.first_name, u.last_name, u.username, u.email, u.mobile,
              u.status, u.avatar, u.job_title, u.role, u.joined_date::text, u.is_active,
              u.sub_unit, u.location,
              CASE
                WHEN u.supervisors IS NULL OR TRIM(u.supervisors) = '' THEN '[]'::json
                ELSE u.supervisors::json
              END AS supervisors,
              CASE
                WHEN u.supervisors IS NULL OR TRIM(u.supervisors) = '' THEN '[]'::json
                ELSE u.supervisors::json
              END AS supervisor_names
       FROM tbl_appusers u
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      values,
    );

    const employeesWithSupervisors = rows.map((employee) => ({
      ...employee,
      supervisor_names: employee.supervisor_names || [],
    }));

    const countValues = searchTerm ? [searchTerm] : [];
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM tbl_appusers u WHERE ${whereClause}`,
      countValues,
    );
    const total = countRows[0]?.total || 0;

    return {
      data: employeesWithSupervisors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    logError("Error in findAllEmployees", err, { page, limit, search });
    throw err;
  }
}

async function findSuperiorUsers({
  page = 1,
  limit = 10,
  search = "",
  role = "",
  status = "",
} = {}) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (currentPage - 1) * pageSize;
  const params = [];
  const conditions = [
    "u.is_deleted = false",
    "(u.employment_status IS NULL OR u.employment_status != 'Terminated')",
  ];

  if (role === ROLES.SUPERVISOR) {
    conditions.push(`u.role IN (${BASIC_SUPERVISOR_ROLES_SQL})`);
  } else if (role === ROLES.HR_ADMIN) {
    conditions.push(`u.role IN (${ADMIN_ROLES_SQL})`);
  } else {
    conditions.push(`u.role IN (${SUPERIOR_ROLES_SQL})`);
  }

  if (search) {
    params.push(`%${search}%`);
    const searchIndex = params.length;
    conditions.push(
      `(u.name ILIKE $${searchIndex}
        OR u.username ILIKE $${searchIndex}
        OR u.email ILIKE $${searchIndex}
        OR u.employee_id ILIKE $${searchIndex}
        OR u.job_title ILIKE $${searchIndex}
        OR u.sub_unit ILIKE $${searchIndex})`,
    );
  }

  if (status === "active") conditions.push("u.is_active = true");
  if (status === "inactive") conditions.push("u.is_active = false");

  const where = conditions.join(" AND ");
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM tbl_appusers u WHERE ${where}`,
    params,
  );
  const total = countRows[0]?.count || 0;
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;
  const { rows } = await pool.query(
    `SELECT id::int, employee_id, name, first_name, last_name, username, email, mobile,
            status, avatar, job_title, role, joined_date::text, is_active,
            sub_unit, location, employment_status, gender
     FROM tbl_appusers u
     WHERE ${where}
     ORDER BY
       CASE WHEN u.role IN (${ADMIN_ROLES_SQL}) THEN 0 ELSE 1 END,
       u.name ASC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    [...params, pageSize, offset],
  );

  return {
    data: rows,
    total,
    page: currentPage,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    limit: pageSize,
  };
}

async function findEmployeeById(id) {
  const { rows } = await pool.query(
    `SELECT id::int, employee_id, first_name, middle_name, last_name, name,
            email, username, role, status, mobile, home_tel, work_tel, other_email,
            avatar, joined_date::text, location, job_title, employment_status,
            job_specification, job_category, sub_unit, attendance_calc,
            dob::text, real_dob::text, nationality, marital_status, gender, blood_group,
            license_number, license_expiry::text, probation_end_date::text,
            date_of_permanence::text, contract_start_date::text, contract_end_date::text,
            comments,
            -- Parse supervisors from TEXT to JSON array; fall back to empty array
            CASE
              WHEN supervisors IS NULL OR TRIM(supervisors) = '' THEN '[]'::json
              ELSE supervisors::json
            END AS supervisors,
            address1, address2, city, country, state, zip,
            is_active, created_at, updated_at
     FROM tbl_appusers
     WHERE id = $1::bigint AND is_deleted = false`,
    [id],
  );
  return rows[0] || null;
}

async function convertSupervisorIdsToNames(supervisors) {
  if (!supervisors) return null;

  try {
    const parsed =
      typeof supervisors === "string" ? JSON.parse(supervisors) : supervisors;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    const validIds = parsed
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id) && id > 0);

    if (validIds.length === 0) return null;

    const { rows } = await pool.query(
      `SELECT name FROM tbl_appusers 
       WHERE id = ANY($1::int[]) 
       AND is_deleted = false 
       ORDER BY name`,
      [validIds],
    );

    if (rows.length === 0) return null;

    const names = rows.map((row) => row.name);
    return JSON.stringify(names);
  } catch {
    return null;
  }
}

async function createEmployee(data, avatarBase64) {
  const name = `${data.first_name} ${data.last_name}`.trim();
  const username = await createUniqueUsername(data.email, name);
  const plainPassword = generateTemporaryPassword();
  const password = await bcrypt.hash(plainPassword, 10);

  const realDob = data.real_dob || data.dob || null;

  // Convert supervisor IDs to names and store names
  const supervisorNames = await convertSupervisorIdsToNames(data.supervisors);

  const { rows } = await pool.query(
    `INSERT INTO tbl_appusers (
      employee_id, first_name, middle_name, last_name, name,
      username, email, password, role, status,
      dob, real_dob, nationality, marital_status, gender, blood_group,
      license_number, license_expiry,
      mobile, home_tel, work_tel, other_email, avatar,
      address1, address2, city, country, state, zip,
      joined_date, location, job_title, employment_status,
      job_specification, job_category, sub_unit, attendance_calc,
      probation_end_date, date_of_permanence,
      contract_start_date, contract_end_date,
      comments, supervisors,
      must_change_password,
      is_active, is_deleted, created_by, updated_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,
      $19,$20,$21,$22,$23,
      $24,$25,$26,$27,$28,$29,
      $30,$31,$32,$33,$34,$35,$36,$37,
      $38,$39,$40,$41,$42,$43,
      true,
      true, false, $44, $44
    ) RETURNING id, name, email, username`,
    [
      data.employee_id || null,
      data.first_name,
      data.middle_name || null,
      data.last_name,
      name,
      username,
      data.email,
      password,
      data.role || "employee",
      "Active",
      data.dob || null,
      realDob,
      data.nationality || null,
      data.marital_status || null,
      data.gender || null,
      data.blood_group || null,
      data.license_number || null,
      data.license_expiry || null,
      data.mobile || null,
      data.home_tel || null,
      data.work_tel || null,
      data.other_email || null,
      avatarBase64 || null,
      data.address1 || null,
      data.address2 || null,
      data.city || null,
      data.country || null,
      data.state || null,
      data.zip || null,
      data.joined_date || null,
      data.location || null,
      data.job_title || null,
      data.employment_status || null,
      data.job_specification || null,
      data.job_category || null,
      data.sub_unit || null,
      data.attendance_calc || null,
      data.probation_end_date || null,
      data.date_of_permanence || null,
      data.contract_start_date || null,
      data.contract_end_date || null,
      data.comments || null,
      supervisorNames,
      data.created_by || null,
    ],
  );
  return { ...rows[0], temporaryPassword: plainPassword };
}

function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const all = `${upper}${lower}${digits}${special}`;
  const required = [upper, lower, digits, special].map(
    (chars) => chars[crypto.randomInt(chars.length)],
  );
  while (required.length < 12) required.push(all[crypto.randomInt(all.length)]);
  for (let index = required.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [required[index], required[swapIndex]] = [
      required[swapIndex],
      required[index],
    ];
  }
  return required.join("");
}

async function updateEmployee(id, data, avatarBase64, updatedBy) {
  const name =
    data.first_name && data.last_name
      ? `${data.first_name} ${data.last_name}`.trim()
      : undefined;

  const n = (value) =>
    value && String(value).trim() !== "" ? String(value).trim() : null;
  const d = (value) =>
    !value || String(value).trim() === "" ? null : String(value).trim();

  const realDob = d(data.real_dob) || d(data.dob);

  // Convert supervisor IDs to names and store names
  const supervisorNames = await convertSupervisorIdsToNames(data.supervisors);

  const result = await pool.query(
    `UPDATE tbl_appusers SET
      first_name        = COALESCE(NULLIF($1,''), first_name),
      middle_name       = $2,
      last_name         = COALESCE(NULLIF($3,''), last_name),
      name              = COALESCE(NULLIF($4,''), name),
      email             = COALESCE(NULLIF($5,''), email),
      employee_id       = $6,
      dob               = $7::date,
      real_dob          = $8::date,
      nationality       = $9,
      marital_status    = $10,
      gender            = $11,
      blood_group       = $12,
      license_number    = $13,
      license_expiry    = $14::date,
      mobile            = $15,
      home_tel          = $16,
      work_tel          = $17,
      other_email       = $18,
      avatar            = COALESCE($19, avatar),
      address1          = $20,
      address2          = $21,
      city              = $22,
      country           = $23,
      state             = $24,
      zip               = $25,
      joined_date       = $26::date,
      location          = $27,
      job_title         = $28,
      employment_status = $29,
      job_specification = $30,
      job_category      = $31,
      sub_unit          = $32,
      attendance_calc   = $33,
      probation_end_date   = $34::date,
      date_of_permanence   = $35::date,
      contract_start_date  = $36::date,
      contract_end_date    = $37::date,
      comments          = $38,
      supervisors       = $39,
      updated_by        = $40,
      updated_at        = NOW()
     WHERE id = $41::bigint AND is_deleted = false`,
    [
      data.first_name || "",
      n(data.middle_name),
      data.last_name || "",
      name || "",
      n(data.email) || "",
      n(data.employee_id),
      d(data.dob),
      realDob, // Use realDob which falls back to dob
      n(data.nationality),
      n(data.marital_status),
      n(data.gender),
      n(data.blood_group),
      n(data.license_number),
      d(data.license_expiry),
      n(data.mobile),
      n(data.home_tel),
      n(data.work_tel),
      n(data.other_email),
      avatarBase64 || null,
      n(data.address1),
      n(data.address2),
      n(data.city),
      n(data.country),
      n(data.state),
      n(data.zip),
      d(data.joined_date),
      n(data.location),
      n(data.job_title),
      n(data.employment_status),
      n(data.job_specification),
      n(data.job_category),
      n(data.sub_unit),
      n(data.attendance_calc),
      d(data.probation_end_date),
      d(data.date_of_permanence),
      d(data.contract_start_date),
      d(data.contract_end_date),
      n(data.comments),
      supervisorNames,
      updatedBy || null,
      id,
    ],
  );

  if (result.rowCount === 0) throw new Error(`No employee found with ID ${id}`);
}

async function softDeleteEmployee(id, deletedBy) {
  const result = await pool.query(
    `UPDATE tbl_appusers SET 
      is_deleted = TRUE,
      is_active = FALSE,
      termination_date = CURRENT_DATE,
      last_working_day = CURRENT_DATE,
      termination_reason = 'Employee Terminated',
      termination_type = 'Involuntary',
      notice_period_days = 0,
      exit_interview_completed = FALSE,
      rehire_eligible = FALSE,
      termination_notes = 'Terminated through employee management system',
      terminated_by_user_id = $1,
      updated_by = $1,
      updated_at = NOW()
    WHERE id = $2::bigint AND is_deleted = FALSE`,
    [deletedBy || null, id],
  );
  if (result.rowCount === 0) throw new Error(`No employee found with ID ${id}`);
}

async function terminateEmployee(
  id,
  terminationReason,
  terminationDateTimeFull,
  terminationDate,
  terminationType,
  lastWorkingDay,
  noticePeriodDays,
  exitInterviewCompleted,
  rehireEligible,
  notes,
  terminatedBy,
) {
  const notesValue = notes !== null && notes !== undefined ? notes : null;

  const result = await pool.query(
    `UPDATE tbl_appusers SET 
           employment_status = 'Terminated',
           is_active = false,
           is_deleted = TRUE,
           termination_date = $1::date,
           termination_reason = $2,
           termination_type = $3,
           last_working_day = $4::date,
           notice_period_days = $5::int,
           exit_interview_completed = $6::boolean,
           rehire_eligible = $7::boolean,
           termination_notes = $8,
           terminated_by_user_id = $9::bigint,
           contract_end_date = $1::date,
           comments = COALESCE(comments, '') || $10,
           updated_by = $11,
           updated_at = NOW()
         WHERE id = $12::bigint AND is_deleted = false`,
    [
      terminationDate,
      terminationReason,
      terminationType || "Voluntary",
      lastWorkingDay || terminationDate,
      parseInt(noticePeriodDays) || 0,
      exitInterviewCompleted === true,
      rehireEligible === true,
      notesValue || `Terminated on ${terminationDateTimeFull}`,
      terminatedBy || null,
      `\nTermination: ${terminationType || "Voluntary"} - ${terminationReason} (${terminationDateTimeFull})${notesValue ? "\nNotes: " + notesValue : ""}`,
      terminatedBy || null,
      id,
    ],
  );
  if (result.rowCount === 0) throw new Error(`No employee found with ID ${id}`);
  return result.rowCount;
}

async function getSupervisors() {
  const { rows: userRows } = await pool.query(
    `SELECT id::int, employee_id, name, username, email, role, job_title, sub_unit
     FROM tbl_appusers
     WHERE is_deleted = false
       AND is_active = true
       AND (employment_status IS NULL OR employment_status != 'Terminated')
       AND role = 'supervisor'
       AND name IS NOT NULL
       AND TRIM(name) <> ''
     ORDER BY name ASC`,
  );

  return userRows.map((row) => ({
    id: row.id,
    employee_id: row.employee_id,
    name: row.name,
    username: row.username,
    email: row.email,
    role: row.role,
    job_title: row.job_title,
    sub_unit: row.sub_unit,
  }));
}

async function getSupervisorsByIds(supervisorIds) {
  if (!supervisorIds || supervisorIds.length === 0) {
    return [];
  }
  const ids = supervisorIds
    .map((id) => Number.parseInt(id, 10))
    .filter(Number.isInteger);

  if (ids.length === 0) {
    return [];
  }
  const { rows } = await pool.query(
    `SELECT id::int, supervisor_name AS name
     FROM tbl_sub_units
     WHERE id = ANY($1::int[])
       AND is_active = true
     ORDER BY supervisor_name ASC`,
    [ids],
  );
  return rows;
}

async function updateProfileImage(id, avatarBase64, updatedBy) {
  const result = await pool.query(
    `UPDATE tbl_appusers SET
      avatar = $1,
      updated_by = $2,
      updated_at = NOW()
     WHERE id = $3::bigint AND is_deleted = false`,
    [avatarBase64, updatedBy || null, id],
  );

  if (result.rowCount === 0) throw new Error(`No employee found with ID ${id}`);

  const { rows } = await pool.query(
    `SELECT id::int, employee_id, first_name, middle_name, last_name, name,
            email, username, role, status, mobile, home_tel, work_tel, other_email,
            avatar, joined_date::text, location, job_title, employment_status,
            job_specification, job_category, sub_unit, attendance_calc,
            dob::text, real_dob::text, nationality, marital_status, gender, blood_group,
            license_number, license_expiry::text,
            address1, address2, city, country, state, zip,
            probation_end_date::text, date_of_permanence::text,
            contract_start_date::text, contract_end_date::text,
            comments, supervisors, is_active
     FROM tbl_appusers WHERE id = $1::bigint AND is_deleted = false`,
    [id],
  );

  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id FROM tbl_appusers WHERE LOWER(email) = LOWER($1) AND is_deleted = false`,
    [email],
  );
  return rows[0] || null;
}

async function findByEmployeeId(employeeId) {
  const { rows } = await pool.query(
    `SELECT id::int, employee_id FROM tbl_appusers WHERE LOWER(employee_id) = LOWER($1) AND is_deleted = false`,
    [employeeId],
  );
  return rows[0] || null;
}

async function getLastEmployeeId() {
  const { rows } = await pool.query(
    `SELECT employee_id FROM tbl_appusers 
     WHERE is_deleted = false AND employee_id IS NOT NULL 
     ORDER BY created_at DESC 
     LIMIT 1`,
  );
  return rows[0] || null;
}

async function getLocations() {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (LOWER(location)) location FROM tbl_appusers 
     WHERE location IS NOT NULL 
       AND TRIM(location) <> ''
       AND is_deleted = false
     ORDER BY LOWER(location) ASC, location ASC`,
  );
  return rows.map((r) => r.location);
}

export {
  findAllEmployees,
  findSuperiorUsers,
  findEmployeeById,
  createEmployee,
  updateEmployee,
  updateProfileImage,
  softDeleteEmployee,
  terminateEmployee,
  getSupervisors,
  getSupervisorsByIds,
  findByEmail,
  findByEmployeeId,
  getLastEmployeeId,
  getLocations,
};
