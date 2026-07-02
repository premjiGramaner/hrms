import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Running migration: add_net_leave_balance_column.sql");

    const sqlPath = join(
      __dirname,
      "database",
      "migrations",
      "add_net_leave_balance_column.sql",
    );
    const sql = readFileSync(sqlPath, "utf8");

    await client.query(sql);
    console.log("✓ Migration completed successfully");
    console.log(
      "✓ Added net_leave_balance_at_request column to tbl_leave_requests",
    );
    console.log("✓ Backfilled existing records with calculated balances");
  } catch (error) {
    console.error("✗ Migration failed:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
