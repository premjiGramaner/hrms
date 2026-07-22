import pg from "pg";
import { logError } from "./src/utils/logger";
const { Pool } = pg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "hrms",
  password: "root",
  port: 5432,
});

async function verifyTerminationData() {
  try {
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM tbl_appusers 
      WHERE is_deleted = TRUE
    `);
    const total = totalResult.rows[0].total;

    const completeResult = await pool.query(`
      SELECT 
        COUNT(*) as total_with_data,
        COUNT(CASE WHEN termination_date IS NOT NULL THEN 1 END) as has_date,
        COUNT(CASE WHEN termination_reason IS NOT NULL THEN 1 END) as has_reason,
        COUNT(CASE WHEN termination_type IS NOT NULL THEN 1 END) as has_type,
        COUNT(CASE WHEN last_working_day IS NOT NULL THEN 1 END) as has_last_day,
        COUNT(CASE WHEN termination_notes IS NOT NULL THEN 1 END) as has_notes
      FROM tbl_appusers 
      WHERE is_deleted = TRUE
    `);

    const stats = completeResult.rows[0];
    const sampleResult = await pool.query(`
      SELECT 
        employee_id,
        name,
        termination_date::text,
        termination_reason,
        termination_type,
        last_working_day::text,
        notice_period_days,
        exit_interview_completed,
        rehire_eligible,
        LEFT(termination_notes, 50) as notes_preview
      FROM tbl_appusers 
      WHERE is_deleted = TRUE
      ORDER BY termination_date DESC
      LIMIT 3
    `);

    sampleResult.rows.forEach((row, idx) => {});

    const allComplete =
      stats.has_date === total &&
      stats.has_reason === total &&
      stats.has_type === total &&
      stats.has_last_day === total &&
      stats.has_notes === total;

    await pool.end();
  } catch (error) {
    logError("Error:", error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyTerminationData();
