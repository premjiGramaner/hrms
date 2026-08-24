import { randomUUID } from "crypto";
import pool from "../config/db.js";
import {
  defaultAppraisalRatingType,
  defaultPerformanceEvaluationHeader,
} from "../config/performance.config.js";
import { SUPERVISOR_ROLES } from "../constants/roles.js";
import AppError from "../utils/AppError.js";

let schemaPromise = null;

const APPRAISAL_SUPERVISOR_REQUIRED_MESSAGE =
  "Appraisals were not created. Assign a valid, active supervisor to the following users:";

const toSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const compact = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const toDate = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";
const toNumber = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const normalizeLookup = (value) => compact(value);

function removeAdjacentDuplicateNames(description) {
  const descriptionParts = String(description || "")
    .split(" - ")
    .map((descriptionPart) => descriptionPart.trim())
    .filter(Boolean);

  return descriptionParts
    .filter(
      (descriptionPart, descriptionIndex) =>
        descriptionIndex === 0 ||
        normalizeLookup(descriptionPart) !==
          normalizeLookup(descriptionParts[descriptionIndex - 1]),
    )
    .join(" - ");
}

const displayTextFor = (question) =>
  question.displayText ||
  `${question.category}_${question.title}_${question.description || ""}`;

function parseSupervisors(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "object") return [value];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function getSupervisorId(item) {
  if (!item) return "";
  if (typeof item === "number" || typeof item === "string") {
    return String(item).trim();
  }
  return String(item.id || item.employee_id || item.employeeId || "").trim();
}

function getSupervisorKey(item) {
  if (!item) return "";
  if (typeof item === "string" || typeof item === "number") {
    return String(item).trim();
  }
  return String(
    item.name ||
      item.employeeName ||
      item.username ||
      item.email ||
      item.employee_id ||
      item.employeeId ||
      item.id ||
      "",
  ).trim();
}

function matchSupervisorUser(supervisor, supervisorUsers = []) {
  const rawKey = getSupervisorKey(supervisor);
  const idKey = getSupervisorId(supervisor);
  if (idKey && /^\d+$/.test(String(idKey))) {
    const byId = supervisorUsers.find(
      (user) => String(user.id) === String(idKey),
    );
    if (byId) return byId;
  }

  const key = normalizeLookup(rawKey);
  if (!key) return null;
  const matchingUsers = supervisorUsers.filter((user) => {
    const possibleValues = [
      user.name,
      user.username,
      user.email,
      user.employee_id,
      user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : "",
    ];
    return possibleValues.some((value) => normalizeLookup(value) === key);
  });

  return matchingUsers.length === 1 ? matchingUsers[0] : null;
}

async function ensurePerformanceSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS appraisal_templates (
      id TEXT PRIMARY KEY,
      job_title TEXT NOT NULL,
      template_name TEXT NOT NULL,
      description TEXT,
      weight NUMERIC(8, 2) NOT NULL DEFAULT 100,
      header TEXT,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS appraisal_template_sections (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES appraisal_templates(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'KPIs',
      weight NUMERIC(8, 2) NOT NULL DEFAULT 100,
      display_order INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS appraisal_template_kpis (
      id TEXT PRIMARY KEY,
      section_id TEXT NOT NULL REFERENCES appraisal_template_sections(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      display_text TEXT NOT NULL,
      weight NUMERIC(8, 2) DEFAULT 0,
      display_order INTEGER NOT NULL,
      mandatory BOOLEAN NOT NULL DEFAULT TRUE,
      rating_type TEXT NOT NULL DEFAULT '${defaultAppraisalRatingType.replace(/'/g, "''")}',
      comments_required BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS appraisal_cycles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT 'All',
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Created',
      template_id TEXT NOT NULL REFERENCES appraisal_templates(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS appraisal_cycle_employees (
      cycle_id TEXT NOT NULL REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
      employee_id BIGINT NOT NULL REFERENCES tbl_appusers(id) ON DELETE CASCADE,
      main_evaluator_id BIGINT REFERENCES tbl_appusers(id),
      status TEXT NOT NULL DEFAULT 'Not Created',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (cycle_id, employee_id)
    );
    CREATE TABLE IF NOT EXISTS appraisals (
      id TEXT PRIMARY KEY,
      cycle_id TEXT NOT NULL REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
      template_id TEXT NOT NULL REFERENCES appraisal_templates(id),
      employee_id BIGINT NOT NULL REFERENCES tbl_appusers(id) ON DELETE CASCADE,
      main_evaluator_id BIGINT REFERENCES tbl_appusers(id),
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      due_date DATE NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'INITIATED',
      self_weight NUMERIC(8, 2) NOT NULL DEFAULT 50,
      supervisor_weight NUMERIC(8, 2) NOT NULL DEFAULT 50,
      self_rating NUMERIC(8, 2) NOT NULL DEFAULT 0,
      supervisor_rating NUMERIC(8, 2) NOT NULL DEFAULT 0,
      self_submitted BOOLEAN NOT NULL DEFAULT FALSE,
      supervisor_submitted BOOLEAN NOT NULL DEFAULT FALSE,
      review_progress INTEGER NOT NULL DEFAULT 0,
      final_rating NUMERIC(8, 2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (cycle_id, employee_id)
    );
    CREATE TABLE IF NOT EXISTS appraisal_ratings (
      id BIGSERIAL PRIMARY KEY,
      appraisal_id TEXT NOT NULL REFERENCES appraisals(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES appraisal_template_kpis(id) ON DELETE CASCADE,
      reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('self', 'supervisor')),
      score NUMERIC(8, 2) NOT NULL DEFAULT 0,
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (appraisal_id, question_id, reviewer_type)
    );
    CREATE INDEX IF NOT EXISTS idx_appraisal_templates_job_title ON appraisal_templates (LOWER(TRIM(job_title)));
    CREATE INDEX IF NOT EXISTS idx_appraisal_template_sections_template ON appraisal_template_sections (template_id);
    CREATE INDEX IF NOT EXISTS idx_appraisal_template_kpis_section ON appraisal_template_kpis (section_id, display_order);
    CREATE INDEX IF NOT EXISTS idx_appraisal_cycles_status ON appraisal_cycles (status);
    CREATE INDEX IF NOT EXISTS idx_appraisals_employee ON appraisals (employee_id);
    CREATE INDEX IF NOT EXISTS idx_appraisals_evaluator ON appraisals (main_evaluator_id);
    `);
    await pool.query(`
      ALTER TABLE appraisal_template_kpis
      DROP CONSTRAINT IF EXISTS appraisal_template_kpis_section_id_display_order_key
    `);
  })();
  return schemaPromise;
}

function normalizeEmployee(row, supervisorUsers = []) {
  const supervisorEntries = parseSupervisors(row.supervisors);
  const seenSupervisorKeys = new Set();
  const supervisors = supervisorEntries
    .map((entry) => {
      const name = getSupervisorKey(entry);
      const matchedUser = matchSupervisorUser(entry, supervisorUsers);
      if (!matchedUser || String(matchedUser.id) === String(row.id)) {
        return null;
      }

      return {
        id: String(matchedUser.id),
        name: matchedUser.name || name || "Supervisor",
        role: matchedUser.role,
        employeeId: matchedUser.employee_id || null,
        jobTitle: matchedUser.job_title || null,
        avatar: matchedUser.avatar || null,
      };
    })
    .filter(Boolean)
    .filter((supervisor) => {
      const supervisorKey = normalizeLookup(
        supervisor.id || supervisor.employeeId || supervisor.name,
      );
      const supervisorNameKey = normalizeLookup(supervisor.name);
      if (
        seenSupervisorKeys.has(supervisorKey) ||
        seenSupervisorKeys.has(supervisorNameKey)
      ) {
        return false;
      }
      seenSupervisorKeys.add(supervisorKey);
      seenSupervisorKeys.add(supervisorNameKey);
      return true;
    });

  return {
    id: String(row.id),
    employeeId: row.employee_id || String(row.id),
    name: row.name,
    jobTitle: row.job_title || "",
    subUnit: row.sub_unit || "",
    location: row.location || "",
    employmentStatus: row.employment_status || row.status || "",
    avatar: row.avatar || null,
    supervisors,
  };
}

async function getSupervisorUsers(databaseClient = pool) {
  const { rows } = await databaseClient.query(
    `SELECT id::int, employee_id, username, email, first_name, last_name,
            name, role, job_title, avatar
     FROM tbl_appusers
     WHERE is_deleted = false
       AND is_active = true
       AND (employment_status IS NULL OR employment_status != 'Terminated')
       AND role = ANY($1::text[])
       AND name IS NOT NULL
       AND TRIM(name) <> ''`,
    [[...SUPERVISOR_ROLES]],
  );
  return rows;
}

async function findEmployees({
  page = 1,
  limit = 100,
  search = "",
  location = "",
  subUnit = "",
  jobTitle = "",
  employmentStatus = "",
} = {}) {
  await ensurePerformanceSchema();
  const offset = (page - 1) * limit;
  const filters = [
    "is_deleted = false",
    "(employment_status IS NULL OR employment_status != 'Terminated')",
  ];
  const values = [];

  const pushFilter = (sql, value) => {
    values.push(value);
    filters.push(sql.replace("?", `$${values.length}`));
  };

  if (search) {
    values.push(`%${search}%`, `%${search}%`);
    filters.push(
      `(name ILIKE $${values.length - 1} OR employee_id ILIKE $${values.length})`,
    );
  }
  if (location && location !== "All") pushFilter("location = ?", location);
  if (subUnit) pushFilter("sub_unit = ?", subUnit);
  if (jobTitle) pushFilter("job_title ILIKE ?", `%${jobTitle}%`);
  if (employmentStatus)
    pushFilter("employment_status ILIKE ?", `%${employmentStatus}%`);

  const where = filters.join(" AND ");
  const supervisorUsers = await getSupervisorUsers();
  const { rows } = await pool.query(
    `SELECT id::int, employee_id, name, status, avatar, job_title, employment_status,
            sub_unit, location, supervisors
     FROM tbl_appusers
     WHERE ${where}
     ORDER BY name ASC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM tbl_appusers WHERE ${where}`,
    values,
  );

  return {
    data: rows.map((row) => normalizeEmployee(row, supervisorUsers)),
    total: countRows[0]?.count || 0,
    page,
    totalPages: Math.ceil((countRows[0]?.count || 0) / limit),
  };
}

function mapTemplateRows(templateRows, sectionRows, questionRows) {
  const sectionMap = new Map();
  sectionRows.forEach((section) => {
    sectionMap.set(section.id, {
      id: section.id,
      name: section.name,
      weight: toNumber(section.weight, 100),
      questions: [],
    });
  });
  questionRows.forEach((question) => {
    const section = sectionMap.get(question.section_id);
    if (!section) return;
    section.questions.push({
      id: question.id,
      category: question.category,
      title: question.title,
      description: question.description || "",
      displayText: question.display_text,
      order: question.display_order,
      weight: toNumber(question.weight, 0),
      mandatory: question.mandatory,
      ratingType: question.rating_type,
      commentsRequired: question.comments_required,
    });
  });

  return templateRows.map((template) => ({
    id: template.id,
    jobTitle: template.job_title,
    templateName: template.template_name,
    description: template.description || "",
    weight: toNumber(template.weight, 100),
    header: template.header || "",
    isDefault: template.is_default,
    sections: sectionRows
      .filter((section) => section.template_id === template.id)
      .sort((a, b) => a.display_order - b.display_order)
      .map((section) => {
        const mapped = sectionMap.get(section.id);
        return {
          ...mapped,
          questions: mapped.questions.sort((a, b) => a.order - b.order),
        };
      }),
  }));
}

async function listTemplates() {
  await ensurePerformanceSchema();
  const [templates, sections, questions] = await Promise.all([
    pool.query(
      "SELECT * FROM appraisal_templates WHERE is_active = true ORDER BY template_name ASC",
    ),
    pool.query(
      "SELECT * FROM appraisal_template_sections ORDER BY display_order ASC",
    ),
    pool.query(
      "SELECT * FROM appraisal_template_kpis WHERE is_active = true ORDER BY display_order ASC",
    ),
  ]);
  return mapTemplateRows(templates.rows, sections.rows, questions.rows);
}

async function findTemplateById(id) {
  await ensurePerformanceSchema();
  const templates = await pool.query(
    "SELECT * FROM appraisal_templates WHERE id = $1 AND is_active = true",
    [id],
  );
  if (templates.rows.length === 0) return null;
  const sections = await pool.query(
    "SELECT * FROM appraisal_template_sections WHERE template_id = $1 ORDER BY display_order ASC",
    [id],
  );
  const sectionIds = sections.rows.map((section) => section.id);
  const questions = sectionIds.length
    ? await pool.query(
        "SELECT * FROM appraisal_template_kpis WHERE section_id = ANY($1::text[]) AND is_active = true ORDER BY display_order ASC",
        [sectionIds],
      )
    : { rows: [] };
  return mapTemplateRows(templates.rows, sections.rows, questions.rows)[0];
}

async function createTemplate(data) {
  await ensurePerformanceSchema();
  const baseId = toSlug(`${data.jobTitle}-${data.templateName}`) || "template";
  const id = data.id || `${baseId}-${Date.now().toString(36)}`;
  const sectionId = `${id}-kpis`;
  await pool.query(
    `INSERT INTO appraisal_templates (id, job_title, template_name, description, weight, header, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      data.jobTitle,
      data.templateName,
      data.description || "",
      data.weight || 100,
      data.header || defaultPerformanceEvaluationHeader,
      Boolean(data.isDefault),
    ],
  );
  await pool.query(
    `INSERT INTO appraisal_template_sections (id, template_id, name, weight, display_order)
     VALUES ($1, $2, 'KPIs', $3, 1)`,
    [sectionId, id, data.weight || 100],
  );
  return findTemplateById(id);
}

async function updateTemplate(id, data) {
  await ensurePerformanceSchema();
  await pool.query(
    `UPDATE appraisal_templates
     SET job_title = COALESCE($2, job_title),
         template_name = COALESCE($3, template_name),
         description = COALESCE($4, description),
         weight = COALESCE($5, weight),
         header = COALESCE($6, header),
         is_default = COALESCE($7, is_default),
         updated_at = NOW()
     WHERE id = $1`,
    [
      id,
      data.jobTitle,
      data.templateName,
      data.description,
      data.weight,
      data.header,
      data.isDefault,
    ],
  );
  return findTemplateById(id);
}

async function cloneTemplate(id) {
  const template = await findTemplateById(id);
  if (!template) return null;
  const client = await pool.connect();
  const cloneId = `${template.id}-copy-${randomUUID()}`;

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO appraisal_templates (id, job_title, template_name, description, weight, header, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [
        cloneId,
        template.jobTitle,
        `${template.templateName} Copy`,
        template.description || "",
        template.weight || 100,
        template.header || defaultPerformanceEvaluationHeader,
      ],
    );

    for (const [sectionIndex, section] of template.sections.entries()) {
      const sectionId = `${cloneId}-section-${sectionIndex + 1}-${randomUUID()}`;
      await client.query(
        `INSERT INTO appraisal_template_sections (id, template_id, name, weight, display_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          sectionId,
          cloneId,
          section.name || "KPIs",
          section.weight || 100,
          sectionIndex + 1,
        ],
      );

      for (const question of section.questions) {
        await client.query(
          `INSERT INTO appraisal_template_kpis
            (id, section_id, category, title, description, display_text, weight, display_order, mandatory, rating_type, comments_required)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            `${cloneId}-kpi-${randomUUID()}`,
            sectionId,
            question.category || "General",
            question.title,
            question.description || "",
            displayTextFor(question),
            question.weight || 0,
            question.order || 1,
            question.mandatory ?? true,
            question.ratingType || defaultAppraisalRatingType,
            question.commentsRequired ?? false,
          ],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return findTemplateById(cloneId);
}

async function deleteTemplate(id) {
  await pool.query(
    "UPDATE appraisal_templates SET is_active = false, updated_at = NOW() WHERE id = $1",
    [id],
  );
  return { id };
}

function validateTemplateKpiWeight(
  template,
  nextWeight,
  excludedQuestionId = null,
) {
  const numericWeight = Number(nextWeight);
  if (!Number.isFinite(numericWeight) || numericWeight < 0) {
    throw new AppError("KPI weight must be zero or greater.", 422);
  }

  const maximumWeight = Number(template.weight) || 100;
  const existingWeight = template.sections
    .flatMap((section) => section.questions)
    .filter((question) => question.id !== excludedQuestionId)
    .reduce(
      (weightTotal, question) => weightTotal + Number(question.weight || 0),
      0,
    );

  if (existingWeight + numericWeight > maximumWeight) {
    const availableWeight = Math.max(0, maximumWeight - existingWeight);
    throw new AppError(
      `The total KPI weight cannot exceed ${maximumWeight}. Only ${availableWeight} weight is available.`,
      422,
    );
  }
}

async function createTemplateKpi(templateId, data) {
  const template = await findTemplateById(templateId);
  if (!template) return null;
  validateTemplateKpiWeight(template, data.weight || 0);
  const section = template.sections[0];
  const nextOrder = data.order || section.questions.length + 1;
  const id = data.id || `${templateId}-kpi-${randomUUID()}`;
  await pool.query(
    `INSERT INTO appraisal_template_kpis
      (id, section_id, category, title, description, display_text, weight, display_order, mandatory, rating_type, comments_required)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      data.sectionId || section.id,
      data.category,
      data.title,
      data.description || "",
      displayTextFor(data),
      data.weight || 0,
      nextOrder,
      data.mandatory ?? true,
      data.ratingType || defaultAppraisalRatingType,
      data.commentsRequired ?? false,
    ],
  );
  return findTemplateById(templateId);
}

async function updateTemplateKpi(templateId, questionId, data) {
  if (data.weight !== undefined && data.weight !== null) {
    const template = await findTemplateById(templateId);
    if (!template) return null;
    validateTemplateKpiWeight(template, data.weight, questionId);
  }

  await pool.query(
    `UPDATE appraisal_template_kpis
     SET category = COALESCE($3, category),
         title = COALESCE($4, title),
         description = COALESCE($5, description),
         display_text = COALESCE($6, display_text),
         weight = COALESCE($7, weight),
         display_order = COALESCE($8, display_order),
         mandatory = COALESCE($9, mandatory),
         rating_type = COALESCE($10, rating_type),
         comments_required = COALESCE($11, comments_required),
         updated_at = NOW()
     WHERE id = $2
       AND section_id IN (SELECT id FROM appraisal_template_sections WHERE template_id = $1)`,
    [
      templateId,
      questionId,
      data.category,
      data.title,
      data.description,
      data.category || data.title || data.description
        ? displayTextFor(data)
        : data.displayText,
      data.weight,
      data.order,
      data.mandatory,
      data.ratingType,
      data.commentsRequired,
    ],
  );
  return findTemplateById(templateId);
}

async function deleteTemplateKpi(templateId, questionId) {
  await pool.query(
    `UPDATE appraisal_template_kpis
     SET is_active = false, updated_at = NOW()
     WHERE id = $2
       AND section_id IN (SELECT id FROM appraisal_template_sections WHERE template_id = $1)`,
    [templateId, questionId],
  );
  return findTemplateById(templateId);
}

async function getEmployeeById(id, { includeInactive = false } = {}) {
  const employeeId = Number(id);
  if (!Number.isInteger(employeeId)) return null;

  const [{ rows }, supervisorUsers] = await Promise.all([
    pool.query(
      `SELECT id::int, employee_id, name, status, avatar, role, job_title,
              employment_status, sub_unit, location, supervisors
       FROM tbl_appusers
       WHERE id = $1
         AND (
           $2::boolean = true
           OR (
             is_deleted = false
             AND (employment_status IS NULL OR employment_status != 'Terminated')
           )
         )`,
      [employeeId, includeInactive],
    ),
    getSupervisorUsers(),
  ]);

  return rows[0] ? normalizeEmployee(rows[0], supervisorUsers) : null;
}

function resolveMainEvaluatorId(employee) {
  const supervisor = employee?.supervisors?.find((item) => {
    const id = getSupervisorId(item);
    return /^\d+$/.test(id);
  });

  if (!supervisor) return null;
  const id = getSupervisorId(supervisor);
  return id ? Number(id) : null;
}

function resolveMainEvaluator(employee, storedEvaluator) {
  const supervisor =
    employee?.supervisors?.find(
      (item) =>
        storedEvaluator && getSupervisorId(item) === String(storedEvaluator.id),
    ) ??
    employee?.supervisors?.find((item) => {
      const id = getSupervisorId(item);
      return /^\d+$/.test(id);
    });
  if (!supervisor) return null;

  const id = getSupervisorId(supervisor);
  const name = getSupervisorKey(supervisor) || id;

  return {
    id: id || name,
    name,
    role:
      typeof supervisor === "object"
        ? supervisor.jobTitle || supervisor.role || "Supervisor"
        : "Supervisor",
    avatar: typeof supervisor === "object" ? supervisor.avatar || null : null,
  };
}

async function getCycleAppraisalCandidates(databaseClient, cycleId) {
  const { rows } = await databaseClient.query(
    `SELECT employee.id::int,
            employee.employee_id,
            employee.name,
            employee.status,
            employee.avatar,
            employee.role,
            employee.job_title,
            employee.employment_status,
            employee.sub_unit,
            employee.location,
            employee.supervisors
     FROM appraisal_cycle_employees cycle_employee
     INNER JOIN tbl_appusers employee
       ON employee.id = cycle_employee.employee_id
     WHERE cycle_employee.cycle_id = $1
     ORDER BY employee.name ASC`,
    [cycleId],
  );
  const supervisorUsers = await getSupervisorUsers(databaseClient);

  return rows.map((employeeRow) => {
    const employee = normalizeEmployee(employeeRow, supervisorUsers);
    return {
      employee,
      mainEvaluator: employee.supervisors?.[0] || null,
    };
  });
}

function buildMissingSupervisorMessage(appraisalCandidates) {
  const employeeNames = appraisalCandidates
    .filter(({ mainEvaluator }) => !mainEvaluator)
    .map(({ employee }) => employee.name || employee.employeeId)
    .sort((firstName, secondName) => firstName.localeCompare(secondName));

  if (employeeNames.length === 0) return null;

  return `${APPRAISAL_SUPERVISOR_REQUIRED_MESSAGE} ${employeeNames.join(", ")}.`;
}

async function mapCycle(row, includeEmployees = true) {
  const cycle = {
    id: row.id,
    name: row.name,
    location: row.location,
    fromDate: toDate(row.from_date),
    toDate: toDate(row.to_date),
    dueDate: toDate(row.due_date),
    status: row.status,
    templateId: row.template_id,
    employeeIds: [],
    employees: [],
  };
  if (!includeEmployees) return cycle;

  const { rows } = await pool.query(
    `SELECT ace.employee_id, ace.main_evaluator_id, ace.status
     FROM appraisal_cycle_employees ace
     WHERE ace.cycle_id = $1
     ORDER BY ace.created_at ASC`,
    [row.id],
  );
  cycle.employeeIds = rows.map((item) => String(item.employee_id));
  const employees = await Promise.all(
    rows.map((item) => getEmployeeById(item.employee_id)),
  );
  const evaluators = await Promise.all(
    rows.map((item) =>
      item.main_evaluator_id ? getEmployeeById(item.main_evaluator_id) : null,
    ),
  );
  cycle.employees = employees.filter(Boolean).map((employee, index) => {
    const storedEvaluator = evaluators[index]
      ? {
          id: evaluators[index].id,
          name: evaluators[index].name,
          role: evaluators[index].jobTitle || "Supervisor",
          avatar: evaluators[index].avatar,
        }
      : null;
    const evaluator = resolveMainEvaluator(employee, storedEvaluator);
    return {
      ...employee,
      mainEvaluator: evaluator,
      evaluators: [evaluator].filter(Boolean),
      status: rows[index].status,
    };
  });
  return cycle;
}

async function listCycles() {
  await ensurePerformanceSchema();
  const { rows } = await pool.query(
    "SELECT * FROM appraisal_cycles ORDER BY created_at DESC",
  );
  return Promise.all(rows.map((row) => mapCycle(row, false)));
}

async function createCycle(data) {
  await ensurePerformanceSchema();
  const template = await findTemplateById(data.templateId);
  if (!template) throw new Error("Template not found");
  const id = data.id || `cycle-${Date.now().toString(36)}`;
  await pool.query(
    `INSERT INTO appraisal_cycles (id, name, location, from_date, to_date, due_date, status, template_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'Created', $7)`,
    [
      id,
      data.name,
      data.location || "All",
      data.fromDate,
      data.toDate,
      data.dueDate,
      template.id,
    ],
  );
  return findCycle(id);
}

async function findCycle(id) {
  await ensurePerformanceSchema();
  const { rows } = await pool.query(
    "SELECT * FROM appraisal_cycles WHERE id = $1",
    [id],
  );
  if (!rows[0]) return null;
  return mapCycle(rows[0], true);
}

async function addEmployeesToCycle(cycleId, employeeIds = []) {
  const cycle = await findCycle(cycleId);
  if (!cycle) return null;
  const uniqueIds = [...new Set(employeeIds.map(String).filter(Boolean))];
  for (const id of uniqueIds) {
    const employee = await getEmployeeById(id);
    if (!employee) continue;
    const evaluatorId = resolveMainEvaluatorId(employee);
    await pool.query(
      `INSERT INTO appraisal_cycle_employees (cycle_id, employee_id, main_evaluator_id, status)
       VALUES ($1, $2, $3, 'Not Created')
       ON CONFLICT (cycle_id, employee_id) DO UPDATE
       SET main_evaluator_id = EXCLUDED.main_evaluator_id, updated_at = NOW()`,
      [cycleId, Number(id), evaluatorId],
    );
  }
  return findCycle(cycleId);
}

async function removeEmployeeFromCycle(cycleId, employeeId) {
  await pool.query(
    "DELETE FROM appraisal_cycle_employees WHERE cycle_id = $1 AND employee_id = $2",
    [cycleId, employeeId],
  );
  await pool.query(
    "DELETE FROM appraisals WHERE cycle_id = $1 AND employee_id = $2",
    [cycleId, employeeId],
  );
  return findCycle(cycleId);
}

async function deleteCycle(cycleId) {
  const cycle = await findCycle(cycleId);
  if (!cycle) return null;
  await pool.query("DELETE FROM appraisal_cycles WHERE id = $1", [cycleId]);
  return cycle;
}

async function updateCycleStatus(cycleId, status) {
  await pool.query(
    "UPDATE appraisal_cycles SET status = $2, updated_at = NOW() WHERE id = $1",
    [cycleId, status],
  );
  return findCycle(cycleId);
}

async function updateCycle(cycleId, data) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (data.templateId !== undefined) {
    updates.push(`template_id = $${paramIndex++}`);
    values.push(data.templateId);
  }
  if (data.fromDate !== undefined) {
    updates.push(`from_date = $${paramIndex++}`);
    values.push(data.fromDate);
  }
  if (data.toDate !== undefined) {
    updates.push(`to_date = $${paramIndex++}`);
    values.push(data.toDate);
  }
  if (data.dueDate !== undefined) {
    updates.push(`due_date = $${paramIndex++}`);
    values.push(data.dueDate);
  }

  if (updates.length === 0) return findCycle(cycleId);

  updates.push(`updated_at = NOW()`);
  values.push(cycleId);

  await pool.query(
    `UPDATE appraisal_cycles SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
    values,
  );
  return findCycle(cycleId);
}

async function checkCycleHasRatings(cycleId) {
  const { rows } = await pool.query(
    `SELECT EXISTS(
       SELECT 1 FROM appraisals
       WHERE cycle_id = $1
       AND (self_submitted = TRUE OR supervisor_submitted = TRUE)
     ) AS has_ratings`,
    [cycleId],
  );
  return rows[0]?.has_ratings || false;
}

async function getCycleCompletionSummary(cycleId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
     FROM appraisals
     WHERE cycle_id = $1`,
    [cycleId],
  );
  const total = rows[0]?.total || 0;
  const completed = rows[0]?.completed || 0;
  return {
    total,
    completed,
    incomplete: Math.max(total - completed, 0),
    canClose: total > 0 && total === completed,
  };
}

async function autoAssignEmployeesToCycle(cycleId) {
  const cycle = await findCycle(cycleId);
  if (!cycle) return null;
  const template = await findTemplateById(cycle.templateId);
  const employeeResult = await findEmployees({
    limit: 1000,
    location: cycle.location,
  });
  const templateJob = compact(template?.jobTitle);
  const matchingEmployees = employeeResult.data.filter((employee) => {
    const employeeJob = compact(employee.jobTitle);
    return (
      employeeJob === templateJob ||
      employeeJob.includes(templateJob) ||
      templateJob.includes(employeeJob)
    );
  });
  const selectedEmployees =
    matchingEmployees.length > 0 ? matchingEmployees : employeeResult.data;
  return addEmployeesToCycle(
    cycleId,
    selectedEmployees.map((employee) => employee.id),
  );
}

async function createAppraisalsForCycle(cycleId) {
  await ensurePerformanceSchema();
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query("BEGIN");
    const { rows: cycleRows } = await databaseClient.query(
      "SELECT * FROM appraisal_cycles WHERE id = $1 FOR UPDATE",
      [cycleId],
    );
    const cycle = cycleRows[0];
    if (!cycle) {
      await databaseClient.query("ROLLBACK");
      return null;
    }

    const appraisalCandidates = await getCycleAppraisalCandidates(
      databaseClient,
      cycleId,
    );
    if (appraisalCandidates.length === 0) {
      throw new AppError(
        "Appraisals were not created. Add at least one user to the cycle.",
        422,
      );
    }

    const missingSupervisorMessage =
      buildMissingSupervisorMessage(appraisalCandidates);
    if (missingSupervisorMessage) {
      throw new AppError(missingSupervisorMessage, 422);
    }

    for (const { employee, mainEvaluator } of appraisalCandidates) {
      const evaluatorId = Number(mainEvaluator.id);
      const appraisalId = `appraisal-${cycle.id}-${employee.id}`;

      await databaseClient.query(
        `UPDATE appraisal_cycle_employees
         SET main_evaluator_id = $3, updated_at = NOW()
         WHERE cycle_id = $1 AND employee_id = $2`,
        [cycleId, Number(employee.id), evaluatorId],
      );
      await databaseClient.query(
        `INSERT INTO appraisals
          (id, cycle_id, template_id, employee_id, main_evaluator_id, from_date, to_date, due_date, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (cycle_id, employee_id) DO UPDATE
         SET main_evaluator_id = EXCLUDED.main_evaluator_id,
             template_id = EXCLUDED.template_id,
             from_date = EXCLUDED.from_date,
             to_date = EXCLUDED.to_date,
             due_date = EXCLUDED.due_date,
             description = EXCLUDED.description,
             updated_at = NOW()`,
        [
          appraisalId,
          cycle.id,
          cycle.template_id,
          Number(employee.id),
          evaluatorId,
          cycle.from_date,
          cycle.to_date,
          cycle.due_date,
          removeAdjacentDuplicateNames(`${cycle.name} - ${employee.name}`),
        ],
      );
    }

    await databaseClient.query(
      "UPDATE appraisal_cycle_employees SET status = 'Created', updated_at = NOW() WHERE cycle_id = $1",
      [cycleId],
    );
    await databaseClient.query(
      "UPDATE appraisal_cycles SET status = 'Activated', updated_at = NOW() WHERE id = $1",
      [cycleId],
    );
    await databaseClient.query("COMMIT");
  } catch (error) {
    await databaseClient.query("ROLLBACK");
    throw error;
  } finally {
    databaseClient.release();
  }

  return listAppraisals({ cycleId });
}

async function ensureDefaultPerformanceData() {
  await ensurePerformanceSchema();
}

function mapAppraisalRow(row) {
  return {
    id: row.id,
    cycleId: row.cycle_id ? String(row.cycle_id) : null,
    employeeId: String(row.employee_id),
    employeeName: row.employee_name,
    from: toDate(row.from_date),
    to: toDate(row.to_date),
    dueDate: toDate(row.due_date),
    description: removeAdjacentDuplicateNames(row.description),
    status: row.status,
    reviewProgress: Number(row.review_progress || 0),
    finalRating: row.final_rating === null ? null : toNumber(row.final_rating),
  };
}

async function listAppraisals({
  userId,
  onlyMine = false,
  employeeOnly = false,
  cycleId,
  from,
  to,
  status,
} = {}) {
  await ensurePerformanceSchema();
  const filters = ["1 = 1"];
  const values = [];

  const push = (val) => {
    values.push(val);
    return `$${values.length}`;
  };

  if (onlyMine && userId) {
    if (employeeOnly) {
      filters.push(`a.employee_id = ${push(Number(userId))}`);
    } else {
      const p1 = push(Number(userId));
      const p2 = push(Number(userId));
      filters.push(`(a.employee_id = ${p1} OR a.main_evaluator_id = ${p2})`);
    }
  }
  if (cycleId && cycleId !== "open") {
    filters.push(`a.cycle_id = ${push(cycleId)}`);
  }
  if (cycleId === "open") {
    filters.push(
      `a.cycle_id IN (SELECT id FROM appraisal_cycles WHERE status NOT IN ('Completed', 'Closed'))`,
    );
  }
  if (from) {
    filters.push(`a.to_date >= ${push(from)}::date`);
  }
  if (to) {
    filters.push(`a.from_date <= ${push(to)}::date`);
  }
  if (status) {
    const statuses = status
      .split(",")
      .map((statusValue) => statusValue.trim())
      .filter(Boolean);
    if (statuses.length > 0) {
      filters.push(`a.status = ANY(${push(statuses)}::text[])`);
    }
  }

  const { rows } = await pool.query(
    `SELECT a.*, u.name AS employee_name
     FROM appraisals a
     JOIN tbl_appusers u ON u.id = a.employee_id
     WHERE ${filters.join(" AND ")}
     ORDER BY a.created_at DESC`,
    values,
  );
  return rows.map(mapAppraisalRow);
}

async function listSupervisorAppraisals({
  userId,
  cycleId,
  from,
  to,
  status,
} = {}) {
  await ensurePerformanceSchema();
  const filters = ["a.main_evaluator_id = $1"];
  const values = [Number(userId)];

  const push = (val) => {
    values.push(val);
    return `$${values.length}`;
  };

  if (cycleId && cycleId !== "open") {
    filters.push(`a.cycle_id = ${push(cycleId)}`);
  }
  if (cycleId === "open") {
    filters.push(
      `a.cycle_id IN (SELECT id FROM appraisal_cycles WHERE status NOT IN ('Completed', 'Closed'))`,
    );
  }
  if (from) {
    filters.push(`a.to_date >= ${push(from)}::date`);
  }
  if (to) {
    filters.push(`a.from_date <= ${push(to)}::date`);
  }
  if (status) {
    const statuses = status
      .split(",")
      .map((statusValue) => statusValue.trim())
      .filter(Boolean);
    if (statuses.length > 0) {
      filters.push(`a.status = ANY(${push(statuses)}::text[])`);
    }
  }

  const { rows } = await pool.query(
    `SELECT a.*, u.name AS employee_name
     FROM appraisals a
     JOIN tbl_appusers u ON u.id = a.employee_id
     WHERE ${filters.join(" AND ")}
     ORDER BY a.created_at DESC`,
    values,
  );
  return rows.map(mapAppraisalRow);
}

const MINIMUM_KPI_RATING = 0.5;
const MAXIMUM_KPI_RATING = 5;
const KPI_RATING_INCREMENT = 0.5;
const REVIEWER_TYPES = new Set(["self", "supervisor"]);

function validateReviewerType(reviewerType) {
  if (!REVIEWER_TYPES.has(reviewerType)) {
    throw new AppError("Reviewer type must be self or supervisor.", 422);
  }
}

function normalizeRatingPayload(ratings, validQuestionIds) {
  if (!Array.isArray(ratings)) {
    throw new AppError("Ratings must be provided as a list.", 422);
  }

  const normalizedRatings = new Map();
  for (const rating of ratings) {
    const questionId = String(rating?.questionId || "").trim();
    if (!questionId || !validQuestionIds.has(questionId)) {
      throw new AppError("One or more ratings reference an invalid KPI.", 422);
    }

    const score = Number(rating.score);
    if (score === 0) {
      normalizedRatings.set(questionId, {
        questionId,
        score: 0,
        comment: String(rating.comment || "").trim(),
      });
      continue;
    }
    if (
      !Number.isFinite(score) ||
      score < MINIMUM_KPI_RATING ||
      score > MAXIMUM_KPI_RATING ||
      !Number.isInteger(score / KPI_RATING_INCREMENT)
    ) {
      throw new AppError(
        `KPI ratings must be between ${MINIMUM_KPI_RATING} and ${MAXIMUM_KPI_RATING} in ${KPI_RATING_INCREMENT} increments.`,
        422,
      );
    }

    normalizedRatings.set(questionId, {
      questionId,
      score,
      comment: String(rating.comment || "").trim(),
    });
  }

  return [...normalizedRatings.values()];
}

function calculateWeightedRating(ratingRows) {
  const ratings = ratingRows.map((ratingRow) => {
    const score = Number(ratingRow.score);
    const isAssigned =
      Number.isFinite(score) &&
      score >= MINIMUM_KPI_RATING &&
      score <= MAXIMUM_KPI_RATING &&
      Number.isInteger(score / KPI_RATING_INCREMENT);
    return {
      score: isAssigned ? score : 0,
      weight: Number(ratingRow.weight),
    };
  });
  if (ratings.length === 0) return 0;

  const useWeights = ratings.every(
    ({ weight }) => Number.isFinite(weight) && weight > 0,
  );
  const totalWeight = ratings.reduce(
    (weightTotal, { weight }) => weightTotal + (useWeights ? weight : 1),
    0,
  );
  const weightedScore = ratings.reduce(
    (scoreTotal, { score, weight }) =>
      scoreTotal + score * (useWeights ? weight : 1),
    0,
  );

  return Number((weightedScore / totalWeight).toFixed(2));
}

async function getRatingContext(databaseClient, appraisalId) {
  const { rows: appraisalRows } = await databaseClient.query(
    `SELECT id, template_id, self_submitted, supervisor_submitted
     FROM appraisals
     WHERE id = $1
     FOR UPDATE`,
    [appraisalId],
  );
  const appraisal = appraisalRows[0];
  if (!appraisal) return null;

  const { rows: questionRows } = await databaseClient.query(
    `SELECT kpi.id, kpi.title, kpi.weight
     FROM appraisal_template_kpis kpi
     INNER JOIN appraisal_template_sections section
       ON section.id = kpi.section_id
     WHERE section.template_id = $1
       AND kpi.is_active = true
     ORDER BY kpi.display_order ASC`,
    [appraisal.template_id],
  );

  return { appraisal, questionRows };
}

async function upsertAppraisalRatings(
  databaseClient,
  appraisalId,
  reviewerType,
  ratings,
) {
  for (const rating of ratings) {
    await databaseClient.query(
      `INSERT INTO appraisal_ratings
         (appraisal_id, question_id, reviewer_type, score, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (appraisal_id, question_id, reviewer_type) DO UPDATE
       SET score = EXCLUDED.score,
           comment = EXCLUDED.comment,
           updated_at = NOW()`,
      [
        appraisalId,
        rating.questionId,
        reviewerType,
        rating.score,
        rating.comment,
      ],
    );
  }
}

async function recalculateAppraisalRating(
  databaseClient,
  appraisalId,
  reviewerType,
) {
  const { rows: ratingRows } = await databaseClient.query(
    `SELECT rating.score, kpi.weight
     FROM appraisals appraisal
     INNER JOIN appraisal_template_sections section
       ON section.template_id = appraisal.template_id
     INNER JOIN appraisal_template_kpis kpi
       ON kpi.section_id = section.id
     LEFT JOIN appraisal_ratings rating
       ON rating.appraisal_id = appraisal.id
      AND rating.question_id = kpi.id
      AND rating.reviewer_type = $2
     WHERE appraisal.id = $1
       AND kpi.is_active = true`,
    [appraisalId, reviewerType],
  );
  const reviewerRating = calculateWeightedRating(ratingRows);
  const ratingColumn =
    reviewerType === "supervisor" ? "supervisor_rating" : "self_rating";

  await databaseClient.query(
    `UPDATE appraisals
     SET ${ratingColumn} = $2, updated_at = NOW()
     WHERE id = $1`,
    [appraisalId, reviewerRating],
  );
}

function ensureReviewIsEditable(appraisal, reviewerType) {
  const alreadySubmitted =
    reviewerType === "supervisor"
      ? appraisal.supervisor_submitted
      : appraisal.self_submitted;
  if (alreadySubmitted) {
    throw new AppError("A submitted review cannot be changed.", 409);
  }
}

async function updateAppraisalRatings({
  appraisalId,
  reviewerType,
  ratings = [],
}) {
  validateReviewerType(reviewerType);
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query("BEGIN");
    const ratingContext = await getRatingContext(databaseClient, appraisalId);
    if (!ratingContext) {
      await databaseClient.query("ROLLBACK");
      return null;
    }

    ensureReviewIsEditable(ratingContext.appraisal, reviewerType);
    const validQuestionIds = new Set(
      ratingContext.questionRows.map((question) => question.id),
    );
    const normalizedRatings = normalizeRatingPayload(ratings, validQuestionIds);
    await upsertAppraisalRatings(
      databaseClient,
      appraisalId,
      reviewerType,
      normalizedRatings,
    );
    await recalculateAppraisalRating(databaseClient, appraisalId, reviewerType);
    await databaseClient.query("COMMIT");
  } catch (error) {
    await databaseClient.query("ROLLBACK");
    throw error;
  } finally {
    databaseClient.release();
  }

  return findAppraisal(appraisalId);
}

async function submitAppraisalReview({
  appraisalId,
  reviewerType,
  ratings = [],
}) {
  validateReviewerType(reviewerType);
  const databaseClient = await pool.connect();

  try {
    await databaseClient.query("BEGIN");
    const ratingContext = await getRatingContext(databaseClient, appraisalId);
    if (!ratingContext) {
      await databaseClient.query("ROLLBACK");
      return null;
    }

    ensureReviewIsEditable(ratingContext.appraisal, reviewerType);
    if (ratingContext.questionRows.length === 0) {
      throw new AppError("This appraisal has no active KPIs to rate.", 422);
    }

    const validQuestionIds = new Set(
      ratingContext.questionRows.map((question) => question.id),
    );
    const normalizedRatings = normalizeRatingPayload(ratings, validQuestionIds);
    await upsertAppraisalRatings(
      databaseClient,
      appraisalId,
      reviewerType,
      normalizedRatings,
    );

    const { rows: assignedRatingRows } = await databaseClient.query(
      `SELECT question_id
       FROM appraisal_ratings
       WHERE appraisal_id = $1
         AND reviewer_type = $2
         AND score BETWEEN $3 AND $4`,
      [appraisalId, reviewerType, MINIMUM_KPI_RATING, MAXIMUM_KPI_RATING],
    );
    const assignedQuestionIds = new Set(
      assignedRatingRows.map((ratingRow) => ratingRow.question_id),
    );
    const missingQuestions = ratingContext.questionRows.filter(
      (question) => !assignedQuestionIds.has(question.id),
    );

    if (missingQuestions.length > 0) {
      const missingTitles = missingQuestions
        .map((question) => question.title)
        .join(", ");
      const reviewerLabel =
        reviewerType === "supervisor" ? "Supervisors" : "Employees";
      throw new AppError(
        `${reviewerLabel} must rate every active KPI before submitting. Missing ratings: ${missingTitles}.`,
        422,
      );
    }

    await recalculateAppraisalRating(databaseClient, appraisalId, reviewerType);
    const isSupervisor = reviewerType === "supervisor";
    await databaseClient.query(
      `UPDATE appraisals
       SET self_submitted =
             CASE WHEN $2 = false THEN true ELSE self_submitted END,
           supervisor_submitted =
             CASE WHEN $2 = true THEN true ELSE supervisor_submitted END,
           updated_at = NOW()
       WHERE id = $1`,
      [appraisalId, isSupervisor],
    );
    await databaseClient.query(
      `UPDATE appraisals
       SET review_progress = ROUND((
             (CASE WHEN self_submitted THEN self_weight ELSE 0 END) +
             (CASE WHEN supervisor_submitted THEN supervisor_weight ELSE 0 END)
           )::numeric)::int,
           final_rating = CASE
             WHEN self_submitted AND supervisor_submitted THEN
               ROUND((
                 (self_rating * self_weight / 100.0) +
                 (supervisor_rating * supervisor_weight / 100.0)
               )::numeric, 2)
             ELSE NULL
           END,
           status =
             CASE
               WHEN self_submitted AND supervisor_submitted
                 THEN 'COMPLETED'
               ELSE 'INITIATED'
             END,
           updated_at = NOW()
       WHERE id = $1`,
      [appraisalId],
    );
    await databaseClient.query("COMMIT");
  } catch (error) {
    await databaseClient.query("ROLLBACK");
    throw error;
  } finally {
    databaseClient.release();
  }

  return findAppraisal(appraisalId);
}

async function findAppraisal(id) {
  await ensurePerformanceSchema();
  const { rows } = await pool.query("SELECT * FROM appraisals WHERE id = $1", [
    id,
  ]);
  const row = rows[0];
  if (!row) return null;
  const [template, employee, evaluator, ratings] = await Promise.all([
    findTemplateById(row.template_id),
    getEmployeeById(row.employee_id, { includeInactive: true }),
    row.main_evaluator_id
      ? getEmployeeById(row.main_evaluator_id, { includeInactive: true })
      : Promise.resolve(null),
    pool.query("SELECT * FROM appraisal_ratings WHERE appraisal_id = $1", [id]),
  ]);
  const ratingMap = new Map();
  ratings.rows.forEach((rating) => {
    const current = ratingMap.get(rating.question_id) || {};
    current[rating.reviewer_type] = toNumber(rating.score);
    current[`${rating.reviewer_type}Comment`] = rating.comment || "";
    ratingMap.set(rating.question_id, current);
  });
  const questions = (template?.sections || [])
    .flatMap((section) => section.questions)
    .sort((a, b) => a.order - b.order)
    .map((question) => ({
      ...question,
      selfScore: ratingMap.get(question.id)?.self || 0,
      supervisorScore: ratingMap.get(question.id)?.supervisor || 0,
      selfComment: ratingMap.get(question.id)?.selfComment || "",
      supervisorComment: ratingMap.get(question.id)?.supervisorComment || "",
    }));

  const mainEvaluator = evaluator
    ? {
        id: evaluator.id,
        name: evaluator.name,
        role: evaluator.jobTitle || "Supervisor",
        avatar: evaluator.avatar,
      }
    : null;

  return {
    id: row.id,
    cycleId: row.cycle_id,
    templateId: row.template_id,
    employee: employee ? { ...employee, mainEvaluator } : null,
    mainEvaluator,
    from: toDate(row.from_date),
    to: toDate(row.to_date),
    dueDate: toDate(row.due_date),
    description: removeAdjacentDuplicateNames(row.description),
    status: row.status,
    selfWeight: toNumber(row.self_weight, 50),
    supervisorWeight: toNumber(row.supervisor_weight, 50),
    selfRating: toNumber(row.self_rating),
    supervisorRating: toNumber(row.supervisor_rating),
    selfSubmitted: row.self_submitted,
    supervisorSubmitted: row.supervisor_submitted,
    reviewProgress: Number(row.review_progress || 0),
    finalRating: row.final_rating === null ? null : toNumber(row.final_rating),
    template,
    questions,
  };
}

async function listTrackers() {
  return [];
}

async function listCompetencyProfiles() {
  const templates = await listTemplates();
  return templates.map((template) => ({
    id: `competency-${template.id}`,
    jobTitle: template.jobTitle,
    subUnits: [...new Set(template.sections.map((section) => section.name))],
    status: "Active",
  }));
}

export {
  addEmployeesToCycle,
  autoAssignEmployeesToCycle,
  checkCycleHasRatings,
  cloneTemplate,
  createAppraisalsForCycle,
  createCycle,
  createTemplate,
  createTemplateKpi,
  deleteCycle,
  deleteTemplate,
  deleteTemplateKpi,
  ensureDefaultPerformanceData,
  findAppraisal,
  findCycle,
  findEmployees,
  findTemplateById,
  listAppraisals,
  listCompetencyProfiles,
  listCycles,
  listSupervisorAppraisals,
  listTemplates,
  listTrackers,
  removeEmployeeFromCycle,
  submitAppraisalReview,
  updateAppraisalRatings,
  updateCycle,
  updateCycleStatus,
  updateTemplate,
  updateTemplateKpi,
  getCycleCompletionSummary,
};
