import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./src/config/db.js";
import { logInfo, logError } from "./src/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_FILE = "014_create_entitlement_history_table.sql";

async function runMigration() {
  try {
    const migrationPath = path.join(
      __dirname,
      "database/migrations",
      MIGRATION_FILE,
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    logInfo(`Running migration ${MIGRATION_FILE}`, {
      migrationPath,
    });
    await pool.query(sql);
    logInfo(`Migration ${MIGRATION_FILE} completed successfully`);
    process.exitCode = 0;
  } catch (error) {
    logError(`Migration ${MIGRATION_FILE} failed`, error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
runMigration();
