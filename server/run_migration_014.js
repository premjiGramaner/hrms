import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const sql = fs.readFileSync(
      path.join(
        __dirname,
        "database/migrations/014_create_entitlement_history_table.sql",
      ),
      "utf8",
    );

    console.log(
      "Running migration 014_create_entitlement_history_table.sql...",
    );
    await pool.query(sql);
    console.log("✓ Migration 014 completed successfully");

    process.exit(0);
  } catch (err) {
    console.error("✗ Migration failed:", err.message);
    console.error(err);
    process.exit(1);
  }
}

runMigration();
