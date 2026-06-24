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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('========================================');
  console.log('Leave Types Cleanup Migration');
  console.log('========================================\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'cleanup_leave_types.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded successfully\n');

    // Confirm before proceeding
    console.log('⚠️  WARNING: This migration will:');
    console.log('   - Remove all leave types except the 8 specified ones');
    console.log('   - Delete leave requests for removed leave types');
    console.log('   - Delete leave entitlements for removed leave types');
    console.log('   - Resequence leave type IDs from 1-8');
    console.log('\n   This action CANNOT be undone!\n');

    // In a production environment, you might want to add a confirmation prompt here
    // For now, we'll add a 3-second delay
    console.log('⏳ Starting migration in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🚀 Executing migration...\n');

    // Execute the migration
    const result = await pool.query(sql);
    
    console.log('✅ Migration executed successfully!\n');

    // Run verification queries
    console.log('🔍 Running verification queries...\n');

    const verifications = [
      {
        name: 'Leave Types Count',
        query: 'SELECT COUNT(*) as count FROM tbl_leave_types WHERE is_deleted = FALSE',
        expected: '8'
      },
      {
        name: 'Leave Types List',
        query: `SELECT id, name, code FROM tbl_leave_types WHERE is_deleted = FALSE ORDER BY id`
      },
      {
        name: 'Sequence Value',
        query: 'SELECT last_value FROM tbl_leave_types_id_seq',
        expected: '8'
      },
      {
        name: 'Orphaned Leave Requests',
        query: `SELECT COUNT(*) as count FROM tbl_leave_requests lr 
                LEFT JOIN tbl_leave_types lt ON lr.leave_type_id = lt.id 
                WHERE lt.id IS NULL AND lr.is_deleted = FALSE`,
        expected: '0'
      },
      {
        name: 'Orphaned Entitlements',
        query: `SELECT COUNT(*) as count FROM tbl_leave_entitlements le 
                LEFT JOIN tbl_leave_types lt ON le.leave_type_id = lt.id 
                WHERE lt.id IS NULL AND le.is_deleted = FALSE`,
        expected: '0'
      }
    ];

    for (const verification of verifications) {
      try {
        const { rows } = await pool.query(verification.query);
        console.log(`✓ ${verification.name}:`);
        console.log('  ', JSON.stringify(rows, null, 2));
        
        if (verification.expected) {
          const actualValue = rows[0]?.count || rows[0]?.last_value;
          if (actualValue?.toString() === verification.expected) {
            console.log(`   ✅ PASS (Expected: ${verification.expected})\n`);
          } else {
            console.log(`   ⚠️  WARNING: Expected ${verification.expected}, got ${actualValue}\n`);
          }
        } else {
          console.log('');
        }
      } catch (err) {
        console.log(`   ✗ Failed to verify: ${err.message}\n`);
      }
    }

    console.log('========================================');
    console.log('Migration Complete!');
    console.log('========================================\n');
    console.log('Next steps:');
    console.log('1. Test the application UI');
    console.log('2. Verify dropdowns show only 8 leave types');
    console.log('3. Test leave request creation');
    console.log('4. Test entitlements management');
    console.log('\nFor detailed verification, run:');
    console.log('  psql -d your_database -f verify_leave_types_cleanup.sql\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    
    if (error.code) {
      console.error('\nPostgreSQL Error Code:', error.code);
    }
    
    console.error('\n⚠️  If the migration was running in a transaction, changes have been rolled back.');
    console.error('   The database should be in its original state.\n');
    
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
