import pool from "../config/db.js";
import { buildExistingQuery } from "../utils/migrationQueryBuilder.js";

export async function createMigrationJob(file, hash, actor) {
  const { rows } = await pool.query(
    `INSERT INTO tbl_data_migrations
       (file_name, file_size, file_hash, uploaded_by, uploaded_by_name)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [file.originalname, file.size, hash, actor?.id || null, actor?.name || actor?.username || "Admin"],
  );
  return rows[0];
}

export async function insertStagedRows(migrationId, stagedRows) {
  if (!stagedRows.length) return;
  await pool.query(
    `INSERT INTO tbl_data_migration_rows
       (migration_id, sheet_name, sheet_order, source_row, entity_type,
        target_table, raw_data, normalized_data, status, validation_errors)
     SELECT $1, item->>'sheetName', (item->>'sheetOrder')::int,
            (item->>'sourceRow')::int, item->>'entityType', item->>'targetTable',
            item->'rawData', item->'normalizedData', item->>'status',
            item->'validationErrors'
     FROM jsonb_array_elements($2::jsonb) item`,
    [migrationId, JSON.stringify(stagedRows)],
  );
}

export async function completeValidation(id, summary) {
  const skippedRecords = summary.invalidRecords
    + (summary.ignoredRecords || 0)
    + (summary.skippedDuplicateRecords || 0);
  const { rows } = await pool.query(
    `UPDATE tbl_data_migrations SET
       status = 'READY', total_sheets=$2, total_records=$3, valid_records=$4,
       invalid_records=$5, duplicate_records=$6, warning_count=$7,
       error_count=$8, skipped_records=$9, processed_records=$9, updated_at=NOW()
     WHERE id=$1 RETURNING *`,
    [id, summary.totalSheets, summary.totalRecords, summary.validRecords,
      summary.invalidRecords, summary.duplicateRecords, summary.warnings, summary.errors,
      skippedRecords],
  );
  return rows[0];
}

export async function getMigration(id) {
  const { rows } = await pool.query("SELECT * FROM tbl_data_migrations WHERE id=$1", [id]);
  return rows[0] || null;
}
export async function getLookupValues(lookupMappings) {
  const values = {};
  for (const [entity, mapping] of Object.entries(lookupMappings)) {
    const query = `SELECT ${mapping.column} AS value FROM ${mapping.table} WHERE is_active = TRUE`;
    const { rows } = await pool.query(query);
    values[entity] = rows.map((row) => String(row.value).trim().toLowerCase().replace(/[\s_-]+/g, " "));
  }
  return values;
}

export async function queueMigration(id, overwriteExisting) {
  const { rows } = await pool.query(
    `UPDATE tbl_data_migrations SET status='QUEUED', overwrite_existing=$2,
       error_message=NULL, updated_at=NOW()
     WHERE id=$1 AND status='READY' RETURNING *`,
    [id, overwriteExisting],
  );
  return rows[0] || null;
}

export async function markRunning(id) {
  await pool.query(
    `UPDATE tbl_data_migrations SET status='RUNNING', started_at=NOW(),
       processed_records=skipped_records, updated_at=NOW()
     WHERE id=$1 AND status='QUEUED'`,
    [id],
  );
}

export async function getStagedFieldValues(id, entityType, field) {
  const { rows } = await pool.query(
    `SELECT DISTINCT normalized_data ->> $3 AS value
     FROM tbl_data_migration_rows
     WHERE migration_id=$1 AND entity_type=$2
       AND status IN ('VALID', 'WARNING')
       AND NULLIF(TRIM(normalized_data ->> $3), '') IS NOT NULL`,
    [id, entityType, field],
  );
  return rows.map((row) => row.value);
}

export async function getProcessRows(id, entityType, afterId, limit) {
  const { rows } = await pool.query(
    `SELECT * FROM tbl_data_migration_rows
     WHERE migration_id=$1 AND entity_type=$2
       AND status IN ('VALID','WARNING') AND id>$3
     ORDER BY id LIMIT $4`,
    [id, entityType, afterId, limit],
  );
  return rows;
}

export async function findExisting(client, mapping, keyValue) {
  const { rows } = await client.query(buildExistingQuery(mapping.table, mapping.keyColumn), [keyValue]);
  if (rows.length > 1) {
    throw new Error(`More than one ${mapping.table} record matches ${mapping.keyColumn} '${keyValue}'`);
  }
  return rows[0] || null;
}

export async function markRow(client, rowId, status, message, targetId = null) {
  await client.query(
    `UPDATE tbl_data_migration_rows SET status=$2, result_message=$3,
       target_record_id=$4, processed_at=NOW() WHERE id=$1`,
    [rowId, status, message, targetId],
  );
}

export async function updateProgress(client, id, progress) {
  await client.query(
    `UPDATE tbl_data_migrations SET processed_records=$2, inserted_records=$3,
       updated_records=$4, skipped_records=$5, failed_records=$6,
       current_sheet=$7, current_row=$8, updated_at=NOW() WHERE id=$1`,
    [id, progress.processed, progress.inserted, progress.updated, progress.skipped,
      progress.failed, progress.currentSheet, progress.currentRow],
  );
}

export async function completeMigration(id, progress, status) {
  await pool.query(
    `UPDATE tbl_data_migrations SET status=$2, processed_records=$3,
       inserted_records=$4, updated_records=$5, skipped_records=$6,
       failed_records=$7, current_sheet=NULL, current_row=NULL,
       completed_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [id, status, progress.processed, progress.inserted, progress.updated,
      progress.skipped, progress.failed],
  );
}

export async function failMigration(id, message) {
  await pool.query(
    `UPDATE tbl_data_migrations SET status='FAILED', error_message=$2,
       completed_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [id, String(message).slice(0, 2000)],
  );
}

export async function getErrors(id, { page, limit, search, severity, status }) {
  const conditions = ["migration_id=$1"];
  const values = [id];
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(sheet_name ILIKE $${values.length} OR raw_data::text ILIKE $${values.length} OR validation_errors::text ILIKE $${values.length})`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status=$${values.length}`);
  } else conditions.push("(jsonb_array_length(validation_errors)>0 OR status='FAILED')");
  if (severity) {
    values.push(severity);
    conditions.push(`validation_errors @> jsonb_build_array(jsonb_build_object('severity', $${values.length}::text))`);
  }
  const where = conditions.join(" AND ");
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int total FROM tbl_data_migration_rows WHERE ${where}`, values);
  values.push(pageSize, (currentPage - 1) * pageSize);
  const { rows } = await pool.query(
    `SELECT id, sheet_name, source_row, status, raw_data, validation_errors, result_message
     FROM tbl_data_migration_rows WHERE ${where}
     ORDER BY sheet_order, source_row LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return { rows, total: countRows[0].total, page: currentPage, limit: pageSize,
    totalPages: Math.max(1, Math.ceil(countRows[0].total / pageSize)) };
}

export async function listMigrations({ page, limit, search }) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
  const values = [];
  let where = "";
  if (search) {
    values.push(`%${search}%`);
    where = "WHERE file_name ILIKE $1 OR uploaded_by_name ILIKE $1";
  }
  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int total FROM tbl_data_migrations ${where}`, values);
  values.push(pageSize, (currentPage - 1) * pageSize);
  const { rows } = await pool.query(
    `SELECT *, EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - COALESCE(started_at, created_at)))::int AS duration_seconds
     FROM tbl_data_migrations ${where} ORDER BY created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return { rows, total: countRows[0].total, page: currentPage, limit: pageSize,
    totalPages: Math.max(1, Math.ceil(countRows[0].total / pageSize)) };
}

export async function getReportRows(id, type) {
  if (type === "leave-errors") {
    const { rows } = await pool.query(
      `SELECT * FROM tbl_data_migration_rows
       WHERE migration_id=$1 AND entity_type='leave_requests'
         AND (jsonb_array_length(validation_errors)>0 OR status IN ('INVALID','FAILED','SKIPPED'))
       ORDER BY sheet_order, source_row`,
      [id],
    );
    return rows;
  }
  const statusMap = {
    errors: ["INVALID", "FAILED"], validation: ["INVALID", "WARNING"],
    skipped: ["SKIPPED", "INVALID"], failed: ["FAILED"],
  };
  const statuses = statusMap[type];
  const values = [id];
  const statusFilter = statuses ? "AND status = ANY($2::text[])" : "";
  if (statuses) values.push(statuses);
  const { rows } = await pool.query(
    `SELECT * FROM tbl_data_migration_rows WHERE migration_id=$1 ${statusFilter}
     ORDER BY sheet_order, source_row`, values,
  );
  return rows;
}

export default pool;

export async function getMigrationReferenceValues() {
  const [employees, leaveTypes, locations] = await Promise.all([
    pool.query(
      `SELECT employee_id, email, username, name, first_name, middle_name, last_name
       FROM tbl_appusers`,
    ),
    pool.query(
      `SELECT name, code FROM tbl_leave_types
       WHERE is_deleted=FALSE AND is_active=TRUE`,
    ),
    pool.query(
      `SELECT DISTINCT location FROM tbl_appusers
       WHERE NULLIF(TRIM(location), '') IS NOT NULL`,
    ),
  ]);
  return {
    employees: employees.rows.flatMap((row) => {
      const compositeName = [row.first_name, row.middle_name, row.last_name]
        .filter((part) => part && !/^-+$/.test(String(part).trim()))
        .join(" ");
      return [row.username, row.name, compositeName].filter(Boolean);
    }),
    leave_types: leaveTypes.rows.flatMap((row) => [row.name, row.code].filter(Boolean)),
    locations: locations.rows.map((row) => row.location),
  };
}

export async function getExistingUniqueValues(mappings, candidates = {}) {
  const values = {};
  const safeIdentifier = (identifier) => {
    if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) throw new Error("Unsafe mapping identifier");
    return `"${identifier}"`;
  };
  for (const mapping of Object.values(mappings)) {
    for (const [field, definition] of Object.entries(mapping.fields)) {
      if (!definition.unique) continue;
      const key = `${mapping.entity}:${field}`;
      const uploadedValues = candidates[key] || [];
      values[key] = [];
      if (!uploadedValues.length) continue;
      const { rows } = await pool.query(
        `SELECT DISTINCT LOWER(TRIM(${safeIdentifier(field)}::text)) AS value
         FROM ${safeIdentifier(mapping.table)}
         WHERE ${safeIdentifier(field)} IS NOT NULL
           AND LOWER(TRIM(${safeIdentifier(field)}::text)) = ANY($1::text[])`,
        [uploadedValues],
      );
      values[key] = rows.map((row) => row.value);
    }
  }
  return values;
}
