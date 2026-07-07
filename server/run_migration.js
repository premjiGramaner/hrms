import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pool from "./src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrations = ["006_performance_and_supervisor_migration.sql"];

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const fileName of migrations) {
      const sqlPath = join(__dirname, "database", "migrations", fileName);
      const sql = readFileSync(sqlPath, "utf8");

      if (!sql.trim()) {
        continue;
      }

      console.log(`Running migration: ${fileName}`);
      await client.query(sql);
      console.log(`✓ Applied ${fileName}`);
    }

    await client.query("COMMIT");
    console.log("✓ Database migrations completed");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("✗ Migration failed:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
