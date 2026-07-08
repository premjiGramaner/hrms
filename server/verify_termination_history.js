import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "hrms",
  password: "root",
  port: 5432,
});

async function verifyTerminationHistory() {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tbl_employee_terminations'
      ) as table_exists;
    `);

    if (!tableCheck.rows[0].table_exists) {
      console.log("\n❌ Table does not exist. Please run the migration first.");
      await pool.end();
      return;
    }

    const triggerCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_create_termination_record'
      ) as trigger_exists;
    `);

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT employee_id) as unique_employees,
        MIN(termination_date) as earliest_date,
        MAX(termination_date) as latest_date,
        COUNT(CASE WHEN termination_type = 'Voluntary' THEN 1 END) as voluntary,
        COUNT(CASE WHEN termination_type = 'Involuntary' THEN 1 END) as involuntary,
        COUNT(CASE WHEN exit_interview_completed = TRUE THEN 1 END) as exit_interviews,
        COUNT(CASE WHEN rehire_eligible = TRUE THEN 1 END) as rehire_eligible
      FROM tbl_employee_terminations
      WHERE is_deleted = FALSE
    `);

    const s = stats.rows[0];

    const sample = await pool.query(`
      SELECT 
        employee_code,
        employee_name,
        job_title,
        termination_date::text,
        termination_reason,
        termination_type,
        terminated_by_name,
        created_at::text
      FROM tbl_employee_terminations
      WHERE is_deleted = FALSE
      ORDER BY termination_date DESC
      LIMIT 5
    `);

    await pool.end();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyTerminationHistory();
