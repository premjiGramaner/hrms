import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'hrms',
  password: 'root',
  port: 5432
});

async function verifyTerminationData() {
  try {
    console.log('\n🔍 VERIFYING TERMINATION REPORTING SYSTEM\n');
    console.log('═'.repeat(70));
    
    // Check total terminated employees
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM tbl_appusers 
      WHERE is_deleted = TRUE
    `);
    const total = totalResult.rows[0].total;
    console.log(`\n✅ Total Terminated Employees: ${total}`);
    
    // Check how many have complete data
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
    console.log('\n📊 Data Completeness:');
    console.log(`   - With Termination Date: ${stats.has_date}/${total}`);
    console.log(`   - With Termination Reason: ${stats.has_reason}/${total}`);
    console.log(`   - With Termination Type: ${stats.has_type}/${total}`);
    console.log(`   - With Last Working Day: ${stats.has_last_day}/${total}`);
    console.log(`   - With Termination Notes: ${stats.has_notes}/${total}`);
    
    // Show sample records
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
    
    console.log('\n📋 Sample Terminated Employees (Latest 3):');
    console.log('─'.repeat(70));
    
    sampleResult.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ${row.name} (${row.employee_id || 'No ID'})`);
      console.log(`   Termination Date: ${row.termination_date || 'N/A'}`);
      console.log(`   Reason: ${row.termination_reason || 'N/A'}`);
      console.log(`   Type: ${row.termination_type || 'N/A'}`);
      console.log(`   Last Working Day: ${row.last_working_day || 'N/A'}`);
      console.log(`   Notice Period: ${row.notice_period_days || 0} days`);
      console.log(`   Exit Interview: ${row.exit_interview_completed ? 'Completed' : 'Not Completed'}`);
      console.log(`   Rehire Eligible: ${row.rehire_eligible ? 'Yes' : 'No'}`);
      console.log(`   Notes: ${row.notes_preview || 'N/A'}...`);
    });
    
    console.log('\n' + '═'.repeat(70));
    
    // Final verdict
    const allComplete = stats.has_date === total && 
                       stats.has_reason === total && 
                       stats.has_type === total &&
                       stats.has_last_day === total &&
                       stats.has_notes === total;
    
    if (allComplete) {
      console.log('\n✅ SUCCESS! All terminated employees have complete data.');
      console.log('✅ Termination reporting system is ready to use!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Restart your backend server: npm start');
      console.log('   2. Open Reports & Analytics → Termination Report');
      console.log('   3. You should see all ' + total + ' employees with full details!');
    } else {
      console.log('\n⚠️  WARNING: Some employees are missing termination data.');
      console.log('   Please run the backfill migration again.');
    }
    
    console.log('\n');
    
    await pool.end();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyTerminationData();
