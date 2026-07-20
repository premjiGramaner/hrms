import pg from "pg";
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
    await pool.query(`
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

    await pool.query(`
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

    await pool.end();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyTerminationData();
