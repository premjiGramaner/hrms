import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { LOOKUP_COLUMNS, MIGRATION_MAPPINGS } from "../config/migrationMappings.js";
import { MIGRATION_LIMITS, MIGRATION_STATUS, ROW_STATUS } from "../constants/migration.js";
import { parseWorkbook } from "./excelParser.service.js";
import { validateWorkbook } from "./migrationValidation.service.js";
import { LeaveMigrationService } from "./leaveMigration.service.js";
import { collectUniqueCandidates, mappingByEntity, tablesAffected } from "./migrationMapping.service.js";
import { buildInsertQuery, buildUpdateQuery } from "../utils/migrationQueryBuilder.js";
import { generateTemporaryPassword } from "../utils/userHelpers.js";
import { logError, logInfo } from "../utils/logger.js";
import { writeAuditLog } from "./audit.service.js";
import * as MigrationModel from "../models/migration.model.js";

const notFound = () => {
  const error = new Error("Migration not found");
  error.statusCode = 404;
  return error;
};

export async function uploadAndValidate(file, actor) {
  const parsed = await parseWorkbook(file.buffer);
  const hash = crypto.createHash("sha256").update(file.buffer).digest("hex");
  const job = await MigrationModel.createMigrationJob(file, hash, actor);
  try {
    const [lookups, references] = await Promise.all([
      MigrationModel.getLookupValues(LOOKUP_COLUMNS),
      MigrationModel.getMigrationReferenceValues(),
    ]);
    const uniqueCandidates = collectUniqueCandidates(parsed);
    const existingUniqueValues = await MigrationModel.getExistingUniqueValues(
      MIGRATION_MAPPINGS,
      uniqueCandidates,
    );
    const validation = validateWorkbook(
      parsed,
      { ...lookups, ...references },
      existingUniqueValues,
    );
    await MigrationModel.insertStagedRows(job.id, validation.stagedRows);
    const updated = await MigrationModel.completeValidation(job.id, validation.summary);
    logInfo("Migration file validated", { migrationId: job.id, ...validation.summary });
    return {
      migration: decorateStatus(updated),
      file: { name: file.originalname, size: file.size, uploadedAt: job.created_at },
      sheets: parsed.sheets.map((sheet) => {
        const sheetRows = validation.stagedRows.filter((row) => row.sheetName === sheet.name);
        const status = sheetRows.length && sheetRows.every((row) => row.status === ROW_STATUS.SKIPPED)
          ? "SKIPPED"
          : sheetRows.some((row) => row.status === ROW_STATUS.INVALID)
            ? "INVALID"
            : "VALID";
        return {
          name: sheet.name,
          recordCount: sheet.rows.length,
          totalColumns: sheet.headers.length,
          headers: sheet.headers,
          preview: sheet.rows.slice(0, MIGRATION_LIMITS.PREVIEW_ROWS).map((row) => row.values),
          status,
        };
      }),
      validation: validation.summary,
      errors: validation.errors.slice(0, 100),
      tablesAffected: tablesAffected(validation.stagedRows.map((row) => row.entityType).filter(Boolean)),
    };
  } catch (error) {
    await MigrationModel.failMigration(job.id, error.message);
    throw error;
  }
}
function decorateStatus(job) {
  if (!job) return null;
  const total = Number(job.total_records) || 0;
  const processed = Number(job.processed_records) || 0;
  const elapsedSeconds = job.started_at
    ? Math.max(0, (Date.now() - new Date(job.started_at).getTime()) / 1000)
    : 0;
  const rate = processed > 0 && elapsedSeconds > 0 ? processed / elapsedSeconds : 0;
  const remaining = Math.max(0, total - processed);
  return {
    ...job,
    percentage: total ? Math.min(100, Math.round((processed / total) * 100)) : 0,
    remaining_records: remaining,
    estimated_remaining_seconds: rate ? Math.ceil(remaining / rate) : null,
    execution_time_seconds: job.completed_at && job.started_at
      ? Math.ceil((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
      : Math.ceil(elapsedSeconds),
  };
}

export async function getStatus(id) {
  const job = await MigrationModel.getMigration(id);
  if (!job) throw notFound();
  return decorateStatus(job);
}

export async function queueMigration(id, overwriteExisting, actor) {
  const existing = await MigrationModel.getMigration(id);
  if (!existing) throw notFound();
  if (existing.status !== MIGRATION_STATUS.READY) {
    const error = new Error(`Migration cannot start while status is ${existing.status}`);
    error.statusCode = 409;
    throw error;
  }
  const queued = await MigrationModel.queueMigration(id, overwriteExisting);
  if (!queued) {
    const error = new Error("Migration was already started by another request");
    error.statusCode = 409;
    throw error;
  }
  setImmediate(() => executeMigration(Number(id), overwriteExisting, actor));
  return { migrationId: Number(id), status: queued.status };
}

async function uniqueUsername(client, record) {
  const source = `${record.first_name || "employee"}.${record.last_name || record.employee_id || "user"}`
    .toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 120) || "employee";
  let username = source;
  let suffix = 1;
  while (true) {
    const { rowCount } = await client.query("SELECT 1 FROM tbl_appusers WHERE username=$1", [username]);
    if (!rowCount) return username;
    username = `${source.slice(0, 135)}_${suffix++}`;
  }
}

function baseRecord(row, actor) {
  const mapping = mappingByEntity(row.entity_type);
  const data = Object.fromEntries(
    Object.keys(mapping.fields)
      .filter((field) => Object.hasOwn(row.normalized_data, field))
      .map((field) => [field, row.normalized_data[field]]),
  );
  if (mapping.kind === "employee") {
    data.name = data.name || [data.first_name, data.middle_name, data.last_name]
      .filter(Boolean).join(" ").trim().slice(0, 200);
    if (data.dob !== undefined) data.real_dob = data.dob;
    data.role = data.role || "employee";
    data.status = data.status || "Active";
    data.is_active = true;
    data.is_deleted = false;
    data.must_change_password = true;
    data.created_by = actor?.id ?? null;
    data.updated_by = actor?.id ?? null;
    return data;
  }
  if (mapping.kind === "employee_enrichment") {
    if (!data.name && data.first_name && data.last_name) {
      data.name = [data.first_name, data.middle_name, data.last_name]
        .filter(Boolean).join(" ").trim().slice(0, 200);
    }
    data.updated_by = actor?.id || null;
    if (mapping.operation === "terminate") {
      data.employment_status = "Terminated";
      data.status = "Terminated";
      data.is_active = false;
      data.is_deleted = true;
      data.termination_type = data.termination_type || "Involuntary";
      data.last_working_day = data.last_working_day || data.termination_date;
      data.terminated_by_user_id = actor?.id || null;
    }
    return data;
  }
  if (data.is_active === null || data.is_active === undefined) data.is_active = true;
  return data;
}

async function insertRecord(client, mapping, data) {
  const insertData = { ...data };
  if (mapping.createEmployee) {
    insertData.username = await uniqueUsername(client, insertData);
    insertData.password = await bcrypt.hash(generateTemporaryPassword(), 10);
  }
  const query = buildInsertQuery(mapping.table, insertData);
  const { rows } = await client.query(query.text, query.values);
  return rows[0]?.id || null;
}

async function ensureReferencedMasters(migrationId) {
  const client = await pool.connect();
  let inserted = 0;
  try {
    await client.query("BEGIN");
    for (const sourceMapping of Object.values(MIGRATION_MAPPINGS)) {
      for (const [field, definition] of Object.entries(sourceMapping.fields)) {
        if (!definition.lookupEntity) continue;
        const masterMapping = mappingByEntity(definition.lookupEntity);
        if (!masterMapping?.table || !masterMapping.keyColumn) continue;
        const values = await MigrationModel.getStagedFieldValues(
          migrationId,
          sourceMapping.entity,
          field,
        );
        for (const value of values) {
          const existing = await MigrationModel.findExisting(client, masterMapping, value);
          if (existing) {
            const query = buildUpdateQuery(
              masterMapping.table,
              { is_active: true },
              masterMapping.keyColumn,
              value,
            );
            if (query) await client.query(query.text, query.values);
            continue;
          }
          await insertRecord(client, masterMapping, {
            [masterMapping.keyColumn]: value,
            is_active: true,
          });
          inserted += 1;
        }
      }
    }
    await client.query("COMMIT");
    if (inserted) logInfo("Migration master values inserted", { migrationId, inserted });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function processRow(client, row, overwriteExisting, actor, leaveMigration) {
  const mapping = mappingByEntity(row.entity_type);
  if (!mapping) throw new Error(`Missing mapping for ${row.entity_type}`);
  if (mapping.kind === "leave_request") {
    if (!leaveMigration) throw new Error("Leave migration context is not initialized");
    return leaveMigration.processRow(client, row);
  }
  if (mapping.unsupportedReason) throw new Error(mapping.unsupportedReason);
  const data = baseRecord(row, actor);
  const keyValue = data[mapping.keyColumn];
  let matchColumn = mapping.keyColumn;
  let existing = await MigrationModel.findExisting(client, mapping, keyValue);
  if (!existing && mapping.createEmployee && data.employee_id) {
    matchColumn = "employee_id";
    existing = await MigrationModel.findExisting(
      client,
      { ...mapping, keyColumn: matchColumn },
      data.employee_id,
    );
  }
  if (!existing && mapping.updateOnly) {
    await MigrationModel.markRow(client, row.id, ROW_STATUS.SKIPPED, `No existing employee matches ${mapping.keyColumn} '${keyValue}'`);
    return "skipped";
  }
  if (!existing && mapping.syntheticEmailForMissing) {
    const legacyKey = crypto.createHash("sha256")
      .update(String(data.employee_id || data.name || row.id))
      .digest("hex")
      .slice(0, 20);
    data.email = `legacy.${legacyKey}@migration.invalid`;
    data.role = data.role || "employee";
    data.must_change_password = false;
    data.created_by = actor?.id ?? null;
  }
  if (existing && !overwriteExisting && mapping.kind !== "employee_enrichment") {
    await MigrationModel.markRow(client, row.id, ROW_STATUS.SKIPPED, "Record already exists; enable overwrite to update it", existing.id);
    return "skipped";
  }
  if (existing) {
    delete data.created_by;
    const query = buildUpdateQuery(mapping.table, data, matchColumn, data[matchColumn]);
    if (query) await client.query(query.text, query.values);
    await MigrationModel.markRow(client, row.id, ROW_STATUS.UPDATED, "Existing record updated", existing.id);
    return "updated";
  }
  const targetId = await insertRecord(client, mapping, data);
  await MigrationModel.markRow(client, row.id, ROW_STATUS.INSERTED, "Record inserted", targetId);
  return "inserted";
}
async function executeMigration(id, overwriteExisting, actor) {
  const executionStartedAt = Date.now();
  const job = await MigrationModel.getMigration(id);
  if (!job || job.status !== MIGRATION_STATUS.QUEUED) return;
  const progress = {
    processed: Number(job.skipped_records),
    inserted: 0,
    updated: 0,
    skipped: Number(job.skipped_records),
    failed: 0,
    currentSheet: null,
    currentRow: null,
  };
  await MigrationModel.markRunning(id);
  logInfo("Migration started", { migrationId: id, totalRecords: job.total_records });
  try {
    await ensureReferencedMasters(id);
    const orderedEntities = Object.values(MIGRATION_MAPPINGS)
      .sort((first, second) => first.priority - second.priority)
      .map((mapping) => mapping.entity);
    let leaveMigration = null;
    for (const entity of orderedEntities) {
      if (entity === "leave_requests" && !leaveMigration) {
        leaveMigration = await LeaveMigrationService.create(pool, id);
      }
      let afterId = 0;
      while (true) {
        const batch = await MigrationModel.getProcessRows(id, entity, afterId, MIGRATION_LIMITS.BATCH_SIZE);
        if (!batch.length) break;
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (const row of batch) {
            afterId = row.id;
            progress.currentSheet = row.sheet_name;
            progress.currentRow = row.source_row;
            await client.query("SAVEPOINT migration_row");
            try {
              const outcome = await processRow(
                client,
                row,
                overwriteExisting,
                actor,
                leaveMigration,
              );
              progress[outcome] += 1;
              await client.query("RELEASE SAVEPOINT migration_row");
            } catch (rowError) {
              await client.query("ROLLBACK TO SAVEPOINT migration_row");
              await MigrationModel.markRow(
                client,
                row.id,
                ROW_STATUS.FAILED,
                String(rowError.message).slice(0, 1000),
              );
              await client.query("RELEASE SAVEPOINT migration_row");
              progress.failed += 1;
              logError("Migration row failed", rowError, {
                migrationId: id,
                sheet: row.sheet_name,
                row: row.source_row,
              });
            }
            progress.processed += 1;
          }
          await MigrationModel.updateProgress(client, id, progress);
          await client.query("COMMIT");
        } catch (batchError) {
          await client.query("ROLLBACK").catch(() => {});
          throw batchError;
        } finally {
          client.release();
        }
      }
    }
    const hasErrors = progress.failed > 0 || Number(job.invalid_records) > 0;
    const finalStatus = hasErrors
      ? MIGRATION_STATUS.COMPLETED_WITH_ERRORS
      : MIGRATION_STATUS.COMPLETED;
    await MigrationModel.completeMigration(id, progress, finalStatus);
    await writeAuditLog({
      action: "DATA_MIGRATION",
      actor,
      section: "HR Administration",
      performedScreen: "Data Migration",
      actionDescription: `Migration #${id} completed: ${progress.inserted} inserted, ${progress.updated} updated, ${progress.skipped} skipped, ${progress.failed} failed`,
    });
    logInfo("Migration completed", {
      migrationId: id,
      ...progress,
      status: finalStatus,
      executionTimeMs: Date.now() - executionStartedAt,
    });
  } catch (error) {
    await MigrationModel.failMigration(id, error.message);
    logError("Migration failed", error, { migrationId: id, processed: progress.processed });
  }
}

export async function getErrors(id, query) {
  if (!(await MigrationModel.getMigration(id))) throw notFound();
  const result = await MigrationModel.getErrors(id, query);
  const flattened = result.rows.flatMap((row) => {
    const issues = row.validation_errors?.length ? row.validation_errors : [{ reason: row.result_message }];
    return issues.map((entry, index) => ({
      id: `${row.id}-${index}`,
      sheet: row.sheet_name,
      row: row.source_row,
      column: entry.column || "",
      invalidValue: entry.invalidValue ?? "",
      reason: entry.reason || row.result_message || "Processing failed",
      suggestedFix: entry.suggestedFix || "Correct the source value and retry the migration.",
      severity: entry.severity || "ERROR",
      status: row.status,
    }));
  });
  return { ...result, rows: flattened };
}

export async function getHistory(query) {
  const result = await MigrationModel.listMigrations(query);
  return { ...result, rows: result.rows.map(decorateStatus) };
}
