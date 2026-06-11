import pool from '../config/db.js';

async function createUniqueUsername(email, name) {
  let base = name
    ? name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    : email.split('@')[0];
  base = base.replace(/^_+|_+$/g, '') || email.split('@')[0];

  let username = base;
  let counter = 1;
  while (true) {
    const { rows } = await pool.query('SELECT id FROM tbl_appusers WHERE username=$1', [username]);
    if (rows.length === 0) break;
    username = `${base}_${counter++}`;
  }
  return username;
}

async function findAllEmployees(page, limit = 15) {
  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `SELECT id::int, employee_id, name, first_name, last_name, username, email, mobile,
            status, avatar, job_title, role, joined_date::text, is_active,
            sub_unit, location, supervisors
     FROM tbl_appusers
     WHERE is_deleted = false AND role = 'employee'
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*)::int as count FROM tbl_appusers WHERE is_deleted = false AND role = 'employee'`
  );
  const total = cnt[0].count;
  return { data: rows, total, page, totalPages: Math.ceil(total / limit) };
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
            comments, supervisors,
            address1, address2, city, country, state, zip,
            is_active, created_at, updated_at
     FROM tbl_appusers
     WHERE id = $1::bigint AND is_deleted = false`,
    [id]
  );
  return rows[0] || null;
}

async function createEmployee(data, avatarPath) {
  const name = `${data.first_name} ${data.last_name}`.trim();
  const username = await createUniqueUsername(data.email, name);
  const password = Math.random().toString(36).slice(2) + 'Aa1!';

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
      is_active, is_deleted, created_by, updated_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,
      $19,$20,$21,$22,$23,
      $24,$25,$26,$27,$28,$29,
      $30,$31,$32,$33,$34,$35,$36,$37,
      $38,$39,$40,$41,$42,$43,
      true, false, $44, $44
    ) RETURNING id, name, email, username`,
    [
      data.employee_id || null,
      data.first_name, data.middle_name || null, data.last_name, name,
      username, data.email, password, data.role || 'employee', 'Active',
      data.dob || null, data.real_dob || null,
      data.nationality || null, data.marital_status || null,
      data.gender || null, data.blood_group || null,
      data.license_number || null, data.license_expiry || null,
      data.mobile || null, data.home_tel || null,
      data.work_tel || null, data.other_email || null,
      avatarPath || null,
      data.address1 || null, data.address2 || null,
      data.city || null, data.country || null,
      data.state || null, data.zip || null,
      data.joined_date || null, data.location || null,
      data.job_title || null, data.employment_status || null,
      data.job_specification || null, data.job_category || null,
      data.sub_unit || null, data.attendance_calc || null,
      data.probation_end_date || null, data.date_of_permanence || null,
      data.contract_start_date || null, data.contract_end_date || null,
      data.comments || null,
      data.supervisors ? JSON.stringify(data.supervisors) : null,
      data.created_by || null,
    ]
  );
  return rows[0];
}

async function updateEmployee(id, data, avatarPath, updatedBy) {
  const name = data.first_name && data.last_name
    ? `${data.first_name} ${data.last_name}`.trim()
    : undefined;

  const n = (v) => (v && String(v).trim() !== '') ? String(v).trim() : null;
  const d = (v) => (!v || String(v).trim() === '') ? null : String(v).trim();

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
      supervisors       = $39::jsonb,
      updated_by        = $40,
      updated_at        = NOW()
     WHERE id = $41::bigint AND is_deleted = false`,
    [
      data.first_name || '', n(data.middle_name),
      data.last_name || '', name || '', n(data.email) || '',
      n(data.employee_id), d(data.dob), d(data.real_dob),
      n(data.nationality), n(data.marital_status), n(data.gender),
      n(data.blood_group), n(data.license_number), d(data.license_expiry),
      n(data.mobile), n(data.home_tel), n(data.work_tel), n(data.other_email),
      avatarPath || null,
      n(data.address1), n(data.address2), n(data.city), n(data.country),
      n(data.state), n(data.zip), d(data.joined_date), n(data.location),
      n(data.job_title), n(data.employment_status), n(data.job_specification),
      n(data.job_category), n(data.sub_unit), n(data.attendance_calc),
      d(data.probation_end_date), d(data.date_of_permanence),
      d(data.contract_start_date), d(data.contract_end_date),
      n(data.comments),
      data.supervisors && data.supervisors.length > 0 ? JSON.stringify(data.supervisors) : null,
      updatedBy || null, id,
    ]
  );

  if (result.rowCount === 0) throw new Error(`No employee found with ID ${id}`);
}

async function softDeleteEmployee(id, deletedBy) {
  const result = await pool.query(
    `UPDATE tbl_appusers SET is_deleted = true, updated_by = $1, updated_at = NOW()
     WHERE id = $2::bigint AND is_deleted = false`,
    [deletedBy || null, id]
  );
  if (result.rowCount === 0) throw new Error(`No employee found with ID ${id}`);
}

async function getSupervisors() {
  const { rows } = await pool.query(
    `SELECT id, name, job_title FROM tbl_appusers
     WHERE is_deleted = false AND is_active = true
     AND role IN ('empmanager', 'hradmin')
     ORDER BY name`
  );
  return rows;
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id FROM tbl_appusers WHERE email = $1 AND is_deleted = false`,
    [email]
  );
  return rows[0] || null;
}

export {
  findAllEmployees,
  findEmployeeById,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
  getSupervisors,
  findByEmail,
};
