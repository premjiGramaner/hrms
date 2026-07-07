import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hrms',
  password: 'root',
  port: 5432
});

async function verifyTerminationHistory() {
  try {
    console.log('\n🔍 VERIFYING TERMINATION HISTORY SYSTEM\n');
    console.log('═'.repeat(70));
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tbl_employee_terminations'
      ) as table_exists;
    `);
    
    console.log('\n📊 SYSTEM STATUS:');
    console.log(`   Table Exists: ${tableCheck.rows[0].table_exists ? '✅ YES' : '❌ NO'}`);
    
    if (!tableCheck.rows[0].table_exists) {
      console.log('\n❌ Table does not exist. Please run the migration first.');
      await pool.end();
      return;
    }
    
    // Check trigger
    const triggerCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_create_termination_record'
      ) as trigger_exists;
    `);
    
    console.log(`   Trigger Exists: ${triggerCheck.rows[0].trigger_exists ? '✅ YES' : '❌ NO'}`);
    
    // Get termination statistics
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
    
    console.log('\n📈 TERMINATION STATISTICS:');
    console.log(`   Total Records: ${s.total_records}`);
    console.log(`   Unique Employees: ${s.unique_employees}`);
    console.log(`   Date Range: ${s.earliest_date} to ${s.latest_date}`);
    console.log(`   Voluntary: ${s.voluntary}`);
    console.log(`   Involuntary: ${s.involuntary}`);
    console.log(`   Exit Interviews Completed: ${s.exit_interviews}`);
    console.log(`   Rehire Eligible: ${s.rehire_eligible}`);
    
    // Get sample records
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
    
    console.log('\n📋 SAMPLE TERMINATION RECORDS (Latest 5):');
    console.log('─'.repeat(70));
    
    sample.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ${row.employee_name} (${row.employee_code || 'No Code'})`);
      console.log(`   Job Title: ${row.job_title || 'N/A'}`);
      console.log(`   Termination Date: ${row.termination_date}`);
      console.log(`   Reason: ${row.termination_reason}`);
      console.log(`   Type: ${row.termination_type}`);
      console.log(`   Terminated By: ${row.terminated_by_name || 'System'}`);
      console.log(`   Record Created: ${row.created_at}`);
    });
    
    console.log('\n' + '═'.repeat(70));
    
    // Final status
    const systemWorking = tableCheck.rows[0].table_exists && 
                         triggerCheck.rows[0].trigger_exists && 
                         s.total_records > 0;
    
    if (systemWorking) {
      console.log('\n✅ TERMINATION HISTORY SYSTEM IS WORKING PERFECTLY!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Restart your backend: npm start');
      console.log('   2. Open Termination Report in browser');
      console.log('   3. You should see ' + s.total_records + ' termination records');
      console.log('   4. Try terminating a test employee to see auto-population');
    } else {
      console.log('\n⚠️  WARNING: System not fully operational');
      console.log('   Please check the migration logs for errors.');
    }
    
    console.log('\n');
    
    await pool.end();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyTerminationHistory();
