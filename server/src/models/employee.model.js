import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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
  const baseWhere =
    "u.is_deleted = false AND u.role = 'employee' AND (u.employment_status IS NULL OR u.employment_status != 'Terminated')";
  const searchCondition = searchTerm
    ? ` AND (u.employee_id ILIKE $3 OR u.first_name ILIKE $3 OR u.last_name ILIKE $3 OR u.email ILIKE $3 OR u.job_title ILIKE $3)`
    : "";
  const args = searchTerm
    ? [limit, offset, `%${searchTerm}%`]
    : [limit, offset];

  try {
    const { rows } = await pool.query(
      `SELECT u.id::int, u.employee_id, u.name, u.first_name, u.last_name, u.username, u.email, u.mobile,
              u.status, u.avatar, u.job_title, u.role, u.joined_date::text, u.is_active,
              u.sub_unit, u.location,
              CASE
                WHEN u.supervisors IS NULL OR TRIM(u.supervisors) = '' THEN '[]'::json
                ELSE u.supervisors::json
              END AS supervisors
       FROM tbl_appusers u
       WHERE ${baseWhere}${searchCondition}
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      args,
    );

    const supervisorIdSet = new Set();

    rows.forEach((employee) => {
      const supervisors = employee.supervisors || [];

      if (Array.isArray(supervisors) && supervisors.length > 0) {
        supervisors
          .map((id) => parseInt(id, 10))
          .filter((id) => !Number.isNaN(id))
          .forEach((id) => supervisorIdSet.add(id));
      }
    });

    const allSupervisorIds = Array.from(supervisorIdSet);
    let supervisorNameById = new Map();

    // CHANGE: Fetch all supervisor names in a single query instead of querying once per employee.
    if (allSupervisorIds.length > 0) {
      try {
        const { rows: supervisorRows } = await pool.query(
          `SELECT id::int, supervisor_name
       FROM tbl_sub_units
       WHERE id = ANY($1::int[]) AND is_active = true`,
          [allSupervisorIds],
        );

        // CHANGE: Create an in-memory lookup map for fast access.
        supervisorNameById = new Map(
          supervisorRows.map((row) => [row.id, row.supervisor_name]),
        );
      } catch (err) {
        console.error("Error fetching supervisor names:", err);
      }
    }

    const employeesWithSupervisors = rows.map((employee) => {
      const supervisors = employee.supervisors || [];

      const supervisorNames = Array.isArray(supervisors)
        ? supervisors
            .map((id) => parseInt(id, 10))
            .filter((id) => !Number.isNaN(id))
            .map((id) => supervisorNameById.get(id))
            .filter((name) => typeof name === "string")
        : [];

      return {
        ...employee,
        supervisor_names: supervisorNames,
      };
    });
    const countQuery = searchCondition
      ? `SELECT COUNT(*)::int as count FROM tbl_appusers u WHERE ${baseWhere}${searchCondition.replace(/\$3/g, "$1")}`
      : `SELECT COUNT(*)::int as count FROM tbl_appusers u WHERE ${baseWhere}`;
    const countArgs = searchTerm ? [`%${searchTerm}%`] : [];
    const { rows: cnt } = await pool.query(countQuery, countArgs);
    const total = cnt[0].count;

    return {
      data: employeesWithSupervisors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.error("Error in findAllEmployees:", err);
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

  if (role === "supervisor") {
    conditions.push("u.role IN ('supervisor', 'manager')");
  } else if (role === "hradmin") {
    conditions.push("u.role IN ('hradmin', 'empmanager')");
  } else {
    conditions.push(
      "u.role IN ('supervisor', 'manager', 'hradmin', 'empmanager')",
    );
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
       CASE WHEN u.role IN ('hradmin', 'empmanager') THEN 0 ELSE 1 END,
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

async function createEmployee(data, avatarPath) {
  const name = `${data.first_name} ${data.last_name}`.trim();
  const username = await createUniqueUsername(data.email, name);
  const plainPassword = generateTemporaryPassword();
  const password = await bcrypt.hash(plainPassword, 10);

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
      data.real_dob || null,
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
      avatarPath || null,
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
      (() => {
        if (!data.supervisors) return null;
        try {
          const parsed =
            typeof data.supervisors === "string"
              ? JSON.parse(data.supervisors)
              : data.supervisors;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validIds = parsed
              .map((id) => parseInt(id, 10))
              .filter((id) => !isNaN(id) && id > 0);
            return validIds.length > 0 ? JSON.stringify(validIds) : null;
          }
          return null;
        } catch {
          return null;
        }
      })(),
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

async function updateEmployee(id, data, avatarPath, updatedBy) {
  const name =
    data.first_name && data.last_name
      ? `${data.first_name} ${data.last_name}`.trim()
      : undefined;

  const n = (value) =>
    value && String(value).trim() !== "" ? String(value).trim() : null;
  const d = (value) =>
    !value || String(value).trim() === "" ? null : String(value).trim();

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
      d(data.real_dob),
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
      avatarPath || null,
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
      (() => {
        if (!data.supervisors) return null;
        try {
          const parsed =
            typeof data.supervisors === "string"
              ? JSON.parse(data.supervisors)
              : data.supervisors;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validIds = parsed
              .map((id) => parseInt(id, 10))
              .filter((id) => !isNaN(id) && id > 0);
            return validIds.length > 0 ? JSON.stringify(validIds) : null;
          }
          return null;
        } catch {
          return null;
        }
      })(),
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

  // Set is_deleted = TRUE to trigger the termination history recording
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
      terminationType || 'Voluntary',
      lastWorkingDay || terminationDate,
      parseInt(noticePeriodDays) || 0,
      exitInterviewCompleted === true,
      rehireEligible === true,
      notesValue || `Terminated on ${terminationDateTimeFull}`,
      terminatedBy || null,
      `\nTermination: ${terminationType || 'Voluntary'} - ${terminationReason} (${terminationDateTimeFull})${notesValue ? '\nNotes: ' + notesValue : ''}`,
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
       AND role IN ('supervisor', 'manager', 'empmanager', 'hradmin')
       AND name IS NOT NULL
       AND TRIM(name) <> ''
     ORDER BY name ASC`,
  );
  const { rows: subUnitRows } = await pool.query(
    `SELECT DISTINCT supervisor_name AS name
     FROM tbl_sub_units
     WHERE supervisor_name IS NOT NULL
       AND TRIM(supervisor_name) <> ''
       AND is_active = true
     ORDER BY supervisor_name ASC`,
  );

  const supervisorMap = new Map();
  const addSupervisor = (item) => {
    const name = String(item.name || "").trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!key || supervisorMap.has(key)) return;
    supervisorMap.set(key, {
      id: item.id || null,
      employee_id: item.employee_id || null,
      name,
      username: item.username || null,
      email: item.email || null,
      role: item.role || "supervisor",
      job_title: item.job_title || "Supervisor",
      sub_unit: item.sub_unit || null,
    });
  };

  userRows.forEach(addSupervisor);
  subUnitRows.forEach((row) =>
    addSupervisor({ ...row, role: "supervisor", job_title: "Supervisor" }),
  );
  return [...supervisorMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
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

async function updateProfileImage(id, profileImagePath, updatedBy) {
  const result = await pool.query(
    `UPDATE tbl_appusers SET
      avatar = $1,
      updated_by = $2,
      updated_at = NOW()
     WHERE id = $3::bigint AND is_deleted = false`,
    [profileImagePath, updatedBy || null, id],
  );

  if (result.rowCount === 0) throw new Error(`No employee found with ID ${id}`);
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id FROM tbl_appusers WHERE email = $1 AND is_deleted = false`,
    [email],
  );
  return rows[0] || null;
}

async function findByEmployeeId(employeeId) {
  const { rows } = await pool.query(
    `SELECT id::int, employee_id FROM tbl_appusers WHERE employee_id = $1 AND is_deleted = false`,
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
