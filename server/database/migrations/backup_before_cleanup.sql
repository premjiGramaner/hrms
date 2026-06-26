-- ============================================================
-- Pre-Migration Backup Script
-- ============================================================
-- Run this BEFORE executing cleanup_leave_types.sql
-- This creates backup tables that can be used for rollback

BEGIN;

\echo '========================================='
\echo 'Creating Backup Tables'
\echo '========================================='

-- Backup tbl_leave_types
DROP TABLE IF EXISTS tbl_leave_types_backup_permanent;
CREATE TABLE tbl_leave_types_backup_permanent AS
SELECT * FROM tbl_leave_types;

\echo 'Created: tbl_leave_types_backup_permanent'

-- Backup tbl_leave_requests
DROP TABLE IF EXISTS tbl_leave_requests_backup_permanent;
CREATE TABLE tbl_leave_requests_backup_permanent AS
SELECT * FROM tbl_leave_requests;

\echo 'Created: tbl_leave_requests_backup_permanent'

-- Backup tbl_leave_entitlements
DROP TABLE IF EXISTS tbl_leave_entitlements_backup_permanent;
CREATE TABLE tbl_leave_entitlements_backup_permanent AS
SELECT * FROM tbl_leave_entitlements;

\echo 'Created: tbl_leave_entitlements_backup_permanent'

-- Get current counts
\echo ''
\echo 'Current Record Counts:'
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

-- Show leave types that will be removed
\echo 'Leave Types That Will Be REMOVED:'
SELECT 
  id,
  name,
  code,
  (SELECT COUNT(*) FROM tbl_leave_requests WHERE leave_type_id = lt.id) as request_count,
  (SELECT COUNT(*) FROM tbl_leave_entitlements WHERE leave_type_id = lt.id) as entitlement_count
FROM tbl_leave_types lt
WHERE code NOT IN ('PL', 'CFPL', 'SL', 'CO', 'LOP', 'ML', 'PTL', 'WFH')
  AND is_deleted = FALSE
ORDER BY id;

\echo ''

-- Show leave types that will be kept
\echo 'Leave Types That Will Be KEPT:'
SELECT 
  id,
  name,
  code,
  (SELECT COUNT(*) FROM tbl_leave_requests WHERE leave_type_id = lt.id) as request_count,
  (SELECT COUNT(*) FROM tbl_leave_entitlements WHERE leave_type_id = lt.id) as entitlement_count
FROM tbl_leave_types lt
WHERE code IN ('PL', 'CFPL', 'SL', 'CO', 'LOP', 'ML', 'PTL', 'WFH')
  AND is_deleted = FALSE
ORDER BY id;

\echo ''

-- Calculate what will be deleted
\echo 'Impact Analysis:'
SELECT 
  'Leave Requests to be deleted' as item,
  COUNT(*) as count
FROM tbl_leave_requests lr
WHERE leave_type_id NOT IN (
  SELECT id FROM tbl_leave_types 
  WHERE code IN ('PL', 'CFPL', 'SL', 'CO', 'LOP', 'ML', 'PTL', 'WFH')
)
UNION ALL
SELECT 
  'Leave Entitlements to be deleted' as item,
  COUNT(*) as count
FROM tbl_leave_entitlements le
WHERE leave_type_id NOT IN (
  SELECT id FROM tbl_leave_types 
  WHERE code IN ('PL', 'CFPL', 'SL', 'CO', 'LOP', 'ML', 'PTL', 'WFH')
);

COMMIT;

\echo ''
\echo '========================================='
\echo 'Backup Complete!'
\echo '========================================='
\echo ''
\echo 'Backup tables created:'
\echo '  - tbl_leave_types_backup_permanent'
\echo '  - tbl_leave_requests_backup_permanent'
\echo '  - tbl_leave_entitlements_backup_permanent'
\echo ''
\echo 'You can now run the cleanup migration:'
\echo '  psql -d your_db -f cleanup_leave_types.sql'
\echo ''
\echo 'To restore from backup (if needed):'
\echo '  psql -d your_db -f restore_from_backup.sql'
\echo '========================================='
