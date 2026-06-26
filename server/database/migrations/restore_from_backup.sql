-- ============================================================
-- Restore From Backup Script
-- ============================================================
-- Use this to restore data if you need to rollback the migration
-- 
-- IMPORTANT: This will restore ALL data to the pre-migration state
-- Any changes made after the migration will be LOST

BEGIN;

\echo '========================================='
\echo 'Restore From Backup'
\echo '========================================='
\echo ''
\echo '⚠️  WARNING: This will restore data to pre-migration state'
\echo ''

-- Check if backup tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_leave_types_backup_permanent') THEN
    RAISE EXCEPTION 'Backup table tbl_leave_types_backup_permanent does not exist. Cannot restore.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_leave_requests_backup_permanent') THEN
    RAISE EXCEPTION 'Backup table tbl_leave_requests_backup_permanent does not exist. Cannot restore.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tbl_leave_entitlements_backup_permanent') THEN
    RAISE EXCEPTION 'Backup table tbl_leave_entitlements_backup_permanent does not exist. Cannot restore.';
  END IF;
  
  RAISE NOTICE 'All backup tables found. Proceeding with restore...';
END $$;

\echo 'Step 1: Deleting current data...'

-- Delete current data
DELETE FROM tbl_leave_requests;
DELETE FROM tbl_leave_entitlements;
DELETE FROM tbl_leave_types;

\echo 'Step 2: Restoring tbl_leave_types...'

-- Restore leave types
INSERT INTO tbl_leave_types
SELECT * FROM tbl_leave_types_backup_permanent;

\echo 'Step 3: Restoring tbl_leave_requests...'

-- Restore leave requests
INSERT INTO tbl_leave_requests
SELECT * FROM tbl_leave_requests_backup_permanent;

\echo 'Step 4: Restoring tbl_leave_entitlements...'

-- Restore leave entitlements
INSERT INTO tbl_leave_entitlements
SELECT * FROM tbl_leave_entitlements_backup_permanent;

\echo 'Step 5: Resetting sequence...'

-- Reset the sequence to the maximum ID
SELECT setval('tbl_leave_types_id_seq', 
  COALESCE((SELECT MAX(id) FROM tbl_leave_types), 1), 
  true
);

\echo ''
\echo 'Verification:'

-- Show restored counts
SELECT 
  'Leave Types' as table_name,
  COUNT(*) as record_count
FROM tbl_leave_types
UNION ALL
SELECT 
  'Leave Requests' as table_name,
  COUNT(*) as record_count
FROM tbl_leave_requests
UNION ALL
SELECT 
  'Leave Entitlements' as table_name,
  COUNT(*) as record_count
FROM tbl_leave_entitlements;

\echo ''

-- Show leave types
SELECT id, name, code, is_deleted, is_active
FROM tbl_leave_types
ORDER BY id;

\echo ''

-- Ask for confirmation before committing
\echo '========================================='
\echo 'Restore Complete (Not Yet Committed)'
\echo '========================================='
\echo ''
\echo 'Review the verification above.'
\echo 'If everything looks correct, type COMMIT; to finalize'
\echo 'If something is wrong, type ROLLBACK; to cancel'
\echo ''
\echo 'Current state: All changes are in transaction'
\echo '========================================='

-- Note: The transaction is left open for manual COMMIT or ROLLBACK
-- User must explicitly commit or rollback
