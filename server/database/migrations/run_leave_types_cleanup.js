/**
 * Leave Types Cleanup Migration Script
 *
 * This script runs the leave types cleanup migration programmatically.
 * It connects to the database and executes the SQL migration file.
 *
 * Usage:
 *   node run_leave_types_cleanup.js
 *
 * Prerequisites:
 *   - PostgreSQL database must be running
 *   - Database connection configured in ../src/config/db.js
 *   - Migration file exists at ./cleanup_leave_types.sql
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, "cleanup_leave_types.sql");

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, "utf8");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const result = await pool.query(sql);

    const verifications = [
      {
        name: "Leave Types Count",
        query:
          "SELECT COUNT(*) as count FROM tbl_leave_types WHERE is_deleted = FALSE",
        expected: "8",
      },
      {
        name: "Leave Types List",
        query: `SELECT id, name, code FROM tbl_leave_types WHERE is_deleted = FALSE ORDER BY id`,
      },
      {
        name: "Sequence Value",
        query: "SELECT last_value FROM tbl_leave_types_id_seq",
        expected: "8",
      },
      {
        name: "Orphaned Leave Requests",
        query: `SELECT COUNT(*) as count FROM tbl_leave_requests lr 
                LEFT JOIN tbl_leave_types lt ON lr.leave_type_id = lt.id 
                WHERE lt.id IS NULL AND lr.is_deleted = FALSE`,
        expected: "0",
      },
      {
        name: "Orphaned Entitlements",
        query: `SELECT COUNT(*) as count FROM tbl_leave_entitlements le 
                LEFT JOIN tbl_leave_types lt ON le.leave_type_id = lt.id 
                WHERE lt.id IS NULL AND le.is_deleted = FALSE`,
        expected: "0",
      },
    ];

    for (const verification of verifications) {
      try {
        const { rows } = await pool.query(verification.query);

        if (verification.expected) {
          const actualValue = rows[0]?.count || rows[0]?.last_value;
          if (actualValue?.toString() === verification.expected) {
          } else {
            console.log(
              `   ⚠️  WARNING: Expected ${verification.expected}, got ${actualValue}\n`,
            );
          }
        } else {
        }
      } catch (err) {
        console.log(`   ✗ Failed to verify: ${err.message}\n`);
      }
    }
  } catch (error) {
    if (error.code) {
      console.error("\nPostgreSQL Error Code:", error.code);
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
