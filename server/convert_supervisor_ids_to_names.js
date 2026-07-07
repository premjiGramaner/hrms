import pool from "./src/config/db.js";

async function convertSupervisorIdsToNames() {
  const client = await pool.connect();
  
  try {
    console.log("🔄 Starting conversion of supervisor IDs to names...");
    
    // Get all employees with supervisors
    const { rows: employees } = await client.query(`
      SELECT id, supervisors 
      FROM tbl_appusers 
      WHERE supervisors IS NOT NULL 
      AND supervisors != '[]'
      AND supervisors != ''
      AND is_deleted = false
    `);
    
    console.log(`📊 Found ${employees.length} employees with supervisors`);
    
    let converted = 0;
    let skipped = 0;
    
    for (const employee of employees) {
      try {
        // Parse supervisors (should be array of IDs like [35, 36])
        let supervisorIds = JSON.parse(employee.supervisors);
        
        // Check if it's already names (strings) or IDs (numbers)
        if (supervisorIds.length > 0 && typeof supervisorIds[0] === 'string') {
          console.log(`⏭️  Employee ${employee.id}: Already has supervisor names, skipping`);
          skipped++;
          continue;
        }
        
        // Convert IDs to integers
        const validIds = supervisorIds
          .map(id => parseInt(id, 10))
          .filter(id => !isNaN(id) && id > 0);
        
        if (validIds.length === 0) {
          console.log(`⚠️  Employee ${employee.id}: No valid supervisor IDs found`);
          continue;
        }
        
        // Fetch supervisor names
        const { rows: supervisors } = await client.query(`
          SELECT name 
          FROM tbl_appusers 
          WHERE id = ANY($1::int[]) 
          AND is_deleted = false
          ORDER BY name
        `, [validIds]);
        
        if (supervisors.length === 0) {
          console.log(`⚠️  Employee ${employee.id}: No supervisors found for IDs ${validIds.join(', ')}`);
          continue;
        }
        
        // Extract names
        const supervisorNames = supervisors.map(s => s.name);
        
        // Update employee record
        await client.query(`
          UPDATE tbl_appusers 
          SET supervisors = $1 
          WHERE id = $2
        `, [JSON.stringify(supervisorNames), employee.id]);
        
        console.log(`✅ Employee ${employee.id}: Converted ${validIds.join(', ')} → ${supervisorNames.join(', ')}`);
        converted++;
        
      } catch (err) {
        console.error(`❌ Error processing employee ${employee.id}:`, err.message);
      }
    }
    
    console.log("\n📈 Conversion Summary:");
    console.log(`   ✅ Converted: ${converted}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total: ${employees.length}`);
    console.log("\n✨ Migration completed!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the conversion
convertSupervisorIdsToNames()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Script failed:", err);
    process.exit(1);
  });
