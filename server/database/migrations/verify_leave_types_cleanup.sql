-- ============================================================
-- Leave Types Cleanup - Verification Script
-- ============================================================
-- Run this script AFTER the cleanup_leave_types.sql migration
-- to verify that everything is working correctly

\echo '========================================='
\echo 'Leave Types Cleanup Verification'
\echo '========================================='
\echo ''

-- Test 1: Count of Leave Types
\echo 'Test 1: Verifying Leave Types Count (Expected: 8)'
SELECT 
  COUNT(*) as total_leave_types,
  CASE 
    WHEN COUNT(*) = 8 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM tbl_leave_types 
WHERE is_deleted = FALSE;

\echo ''

-- Test 2: List All Leave Types with Details
\echo 'Test 2: Leave Types Details'
SELECT 
  id,
  name,
  code,
  max_days,
  carry_forward,
  is_active
FROM tbl_leave_types 
WHERE is_deleted = FALSE
ORDER BY id;

\echo ''

-- Test 3: Verify Sequential IDs (No Gaps)
\echo 'Test 3: Verifying Sequential IDs (Expected: 1,2,3,4,5,6,7,8)'
SELECT 
  string_agg(id::text, ',' ORDER BY id) as id_sequence,
  CASE 
    WHEN string_agg(id::text, ',' ORDER BY id) = '1,2,3,4,5,6,7,8' THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM tbl_leave_types 
WHERE is_deleted = FALSE;

\echo ''

-- Test 4: Check Sequence Value
\echo 'Test 4: Verifying Sequence Next Value (Expected: 9)'
SELECT 
  last_value,
  CASE 
    WHEN last_value = 8 THEN '✓ PASS (Next ID will be 9)'
    ELSE '✗ FAIL'
  END as status
FROM tbl_leave_types_id_seq;

\echo ''

-- Test 5: Foreign Key Integrity - Leave Requests
\echo 'Test 5: Foreign Key Integrity - Leave Requests (Expected: 0 orphaned)'
SELECT 
  COUNT(*) as orphaned_leave_requests,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM tbl_leave_requests lr
LEFT JOIN tbl_leave_types lt ON lr.leave_type_id = lt.id
WHERE lt.id IS NULL AND lr.is_deleted = FALSE;

\echo ''

-- Test 6: Foreign Key Integrity - Leave Entitlements
\echo 'Test 6: Foreign Key Integrity - Entitlements (Expected: 0 orphaned)'
SELECT 
  COUNT(*) as orphaned_entitlements,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as status
FROM tbl_leave_entitlements le
LEFT JOIN tbl_leave_types lt ON le.leave_type_id = lt.id
WHERE lt.id IS NULL AND le.is_deleted = FALSE;

\echo ''

-- Test 7: Leave Requests by Type
\echo 'Test 7: Leave Requests Count by Type'
SELECT 
  lt.id,
  lt.name,
  COUNT(lr.id) as total_requests
FROM tbl_leave_types lt
LEFT JOIN tbl_leave_requests lr ON lr.leave_type_id = lt.id AND lr.is_deleted = FALSE
WHERE lt.is_deleted = FALSE
GROUP BY lt.id, lt.name
ORDER BY lt.id;

\echo ''

-- Test 8: Leave Entitlements by Type
\echo 'Test 8: Leave Entitlements Count by Type'
SELECT 
  lt.id,
  lt.name,
  COUNT(le.id) as total_entitlements
FROM tbl_leave_types lt
LEFT JOIN tbl_leave_entitlements le ON le.leave_type_id = lt.id AND le.is_deleted = FALSE
WHERE lt.is_deleted = FALSE
GROUP BY lt.id, lt.name
ORDER BY lt.id;

\echo ''

-- Test 9: Verify Expected Leave Types Exist
\echo 'Test 9: Verify All 8 Required Leave Types Exist'
SELECT 
  CASE 
    WHEN COUNT(*) = 8 THEN '✓ PASS - All leave types present'
    ELSE '✗ FAIL - Missing ' || (8 - COUNT(*))::text || ' leave type(s)'
  END as status
FROM tbl_leave_types
WHERE is_deleted = FALSE
  AND code IN ('PL', 'CFPL', 'SL', 'CO', 'LOP', 'ML', 'PTL', 'WFH');

\echo ''

-- Test 10: Check for Unexpected Leave Types
\echo 'Test 10: Check for Unexpected Leave Types (Should be empty)'
SELECT 
  id,
  name,
  code,
  '✗ UNEXPECTED' as status
FROM tbl_leave_types
WHERE is_deleted = FALSE
  AND code NOT IN ('PL', 'CFPL', 'SL', 'CO', 'LOP', 'ML', 'PTL', 'WFH');

\echo ''

-- Test 11: Summary Statistics
\echo 'Test 11: Overall Summary'
SELECT 
  (SELECT COUNT(*) FROM tbl_leave_types WHERE is_deleted = FALSE) as total_leave_types,
  (SELECT COUNT(*) FROM tbl_leave_requests WHERE is_deleted = FALSE) as total_leave_requests,
  (SELECT COUNT(*) FROM tbl_leave_entitlements WHERE is_deleted = FALSE) as total_entitlements;

\echo ''
\echo '========================================='
\echo 'Verification Complete'
\echo '========================================='
\echo 'All tests should show ✓ PASS status'
\echo 'If any test shows ✗ FAIL, review the migration'
\echo '========================================='
