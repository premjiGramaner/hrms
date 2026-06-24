-- ============================================================
-- Leave Types Cleanup Migration
-- ============================================================
-- This script removes unwanted leave types and resequences IDs
-- while preserving all foreign key relationships

BEGIN;

-- Step 1: Create a temporary mapping table for old ID to new ID
CREATE TEMP TABLE leave_type_id_mapping (
  old_id INT,
  new_id INT,
  name VARCHAR(100),
  code VARCHAR(50)
);

-- Step 2: Define the leave types to keep with their new sequential IDs
-- Insert mapping for the 8 leave types we want to keep
INSERT INTO leave_type_id_mapping (new_id, name, code) VALUES
  (1, 'Privileged Leave', 'PL'),
  (2, 'Carry Forward - Privileged Leave', 'CFPL'),
  (3, 'Sick Leave', 'SL'),
  (4, 'Comp Off', 'CO'),
  (5, 'Loss of Pay', 'LOP'),
  (6, 'Maternity Leave', 'ML'),
  (7, 'Paternity Leave', 'PTL'),
  (8, 'Work From Home', 'WFH');

-- Step 3: Update the mapping table with old IDs from existing data
UPDATE leave_type_id_mapping m
SET old_id = lt.id
FROM tbl_leave_types lt
WHERE lt.code = m.code;

-- Step 4: Update foreign key references in tbl_leave_requests
-- Only update records that reference leave types we're keeping
UPDATE tbl_leave_requests
SET leave_type_id = m.new_id
FROM leave_type_id_mapping m
WHERE tbl_leave_requests.leave_type_id = m.old_id
  AND m.old_id IS NOT NULL;

-- Step 5: Delete leave requests that reference leave types being removed
DELETE FROM tbl_leave_requests
WHERE leave_type_id NOT IN (SELECT old_id FROM leave_type_id_mapping WHERE old_id IS NOT NULL);

-- Step 6: Update foreign key references in tbl_leave_entitlements
-- Only update records that reference leave types we're keeping
UPDATE tbl_leave_entitlements
SET leave_type_id = m.new_id
FROM leave_type_id_mapping m
WHERE tbl_leave_entitlements.leave_type_id = m.old_id
  AND m.old_id IS NOT NULL;

-- Step 7: Delete entitlements that reference leave types being removed
DELETE FROM tbl_leave_entitlements
WHERE leave_type_id NOT IN (SELECT old_id FROM leave_type_id_mapping WHERE old_id IS NOT NULL);

-- Step 8: Create a backup of the current leave types (optional, for safety)
CREATE TEMP TABLE tbl_leave_types_backup AS
SELECT * FROM tbl_leave_types;

-- Step 9: Delete all existing leave types
DELETE FROM tbl_leave_types;

-- Step 10: Insert the 8 leave types with new sequential IDs
INSERT INTO tbl_leave_types (id, name, code, description, max_days, carry_forward, is_active, is_deleted, created_at, updated_at) VALUES
  (1, 'Privileged Leave', 'PL', NULL, 18, TRUE, TRUE, FALSE, NOW(), NOW()),
  (2, 'Carry Forward - Privileged Leave', 'CFPL', NULL, 30, TRUE, TRUE, FALSE, NOW(), NOW()),
  (3, 'Sick Leave', 'SL', NULL, 12, FALSE, TRUE, FALSE, NOW(), NOW()),
  (4, 'Comp Off', 'CO', NULL, 6, FALSE, TRUE, FALSE, NOW(), NOW()),
  (5, 'Loss of Pay', 'LOP', NULL, 0, FALSE, TRUE, FALSE, NOW(), NOW()),
  (6, 'Maternity Leave', 'ML', NULL, 180, FALSE, TRUE, FALSE, NOW(), NOW()),
  (7, 'Paternity Leave', 'PTL', NULL, 15, FALSE, TRUE, FALSE, NOW(), NOW()),
  (8, 'Work From Home', 'WFH', NULL, 60, FALSE, TRUE, FALSE, NOW(), NOW());

-- Step 11: Reset the sequence to start from 9 (next available ID)
SELECT setval('tbl_leave_types_id_seq', 9, false);

-- Step 12: Verify the results
DO $$
DECLARE
  leave_type_count INT;
  entitlement_count INT;
  request_count INT;
BEGIN
  SELECT COUNT(*) INTO leave_type_count FROM tbl_leave_types WHERE is_deleted = FALSE;
  SELECT COUNT(*) INTO entitlement_count FROM tbl_leave_entitlements;
  SELECT COUNT(*) INTO request_count FROM tbl_leave_requests;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Leave types count: %', leave_type_count;
  RAISE NOTICE 'Leave entitlements count: %', entitlement_count;
  RAISE NOTICE 'Leave requests count: %', request_count;
  
  IF leave_type_count <> 8 THEN
    RAISE EXCEPTION 'Expected 8 leave types but found %', leave_type_count;
  END IF;
END $$;

COMMIT;

-- Display final leave types
SELECT id, name, code, max_days, carry_forward, is_active 
FROM tbl_leave_types 
ORDER BY id;
