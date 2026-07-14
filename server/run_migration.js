import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, "database", "migrations");

/**
 * Ordered list of migrations to apply.
 *
 * Order is by dependency, not just filename. Every migration listed here is
 * idempotent (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE /
 * ON CONFLICT), so re-running against an existing database is safe.
 *
 * Intentionally EXCLUDED (do not add to this list):
 *   - 005_add_supervisor_id_column.sql  -> not idempotent; superseded by
 *     006_performance_and_supervisor_migration.sql (adds supervisor_id IF NOT EXISTS)
 *   - 005_performance_management.sql    -> superseded by the 006 combined migration
 *   - leave_types_seed.sql              -> no-op (its own note says types live in leave_management.sql)
 *   - backup_before_cleanup.sql, restore_from_backup.sql, cleanup_leave_types.sql,
 *     verify_leave_types_cleanup.sql    -> situational / destructive maintenance scripts
 *   - run_leave_types_cleanup.js        -> not a SQL migration
 */
const migrations = [
  // Base users/employees table that everything else references
  "000_create_tbl_appusers.sql",
  "001_create_tbl_job_titles.sql",
  "002_create_tbl_job_categories.sql",
  "003_create_tbl_sub_units.sql",
  "004_create_tbl_audit_log.sql",
  // 006 combined creates supervisor_id + password_reset_token + performance tables
  "006_performance_and_supervisor_migration.sql",
  // widen password_reset_token to TEXT (column now exists from the migration above)
  "005_fix_password_reset_token_column.sql",
  "006_add_supervisor_email_to_sub_units.sql",
  "007_create_reports_tables.sql",
  "008_add_termination_details.sql",
  "009_backfill_termination_data.sql",
  "010_create_termination_history_table.sql",
  "011_fix_termination_trigger_ambiguous_column.sql",
  "012_backfill_real_dob_from_dob.sql",
  "013_add_external_emails_to_notification_config.sql",
  // Leave management module
  "leave_management.sql",
  "add_password_reset_columns.sql",
  "add_net_leave_balance_column.sql",
];

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied(client) {
  const { rows } = await client.query(
    "SELECT filename FROM schema_migrations",
  );
  return new Set(rows.map((r) => r.filename));
}

/**
 * Apply all pending migrations. Each migration runs in its own transaction and
 * is recorded in schema_migrations on success, so it is applied exactly once.
 *
 * @param {{ silent?: boolean }} [options]
 * @returns {Promise<{ applied: string[], skipped: string[] }>}
 */
export async function runMigrations(options = {}) {
  const { silent = false } = options;
  const log = (...args) => {
    if (!silent) console.log(...args);
  };

  const applied = [];
  const skipped = [];

  const setupClient = await pool.connect();
  let alreadyApplied;
  try {
    await ensureMigrationsTable(setupClient);
    alreadyApplied = await getApplied(setupClient);
  } finally {
    setupClient.release();
  }

  for (const fileName of migrations) {
    if (alreadyApplied.has(fileName)) {
      skipped.push(fileName);
      log(`↷ skip    ${fileName} (already applied)`);
      continue;
    }

    const sqlPath = join(MIGRATIONS_DIR, fileName);
    const sql = readFileSync(sqlPath, "utf8");

    if (!sql.trim()) {
      skipped.push(fileName);
      log(`↷ skip    ${fileName} (empty)`);
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
        [fileName],
      );
      await client.query("COMMIT");
      applied.push(fileName);
      log(`✓ applied ${fileName}`);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => { });
      console.error(`✗ failed  ${fileName}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  log(
    `\nMigrations complete: ${applied.length} applied, ${skipped.length} already up to date.`,
  );
  return { applied, skipped };
}

/**
 * Print which migrations are applied vs pending without changing anything.
 */
async function printStatus() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const alreadyApplied = await getApplied(client);
    console.log("Migration status:\n");
    for (const fileName of migrations) {
      const mark = alreadyApplied.has(fileName) ? "✓ applied" : "• pending";
      console.log(`  ${mark}  ${fileName}`);
    }
    const pending = migrations.filter((m) => !alreadyApplied.has(m)).length;
    console.log(`\n${pending} pending / ${migrations.length} total.`);
  } finally {
    client.release();
  }
}

// CLI entry point: `node run_migration.js` (run) or `node run_migration.js status`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2];
  const task = command === "status" ? printStatus() : runMigrations();

  task
    .then(() => pool.end())
    .catch((error) => {
      console.error("Fatal error:", error);
      pool.end().finally(() => process.exit(1));
    });
}
