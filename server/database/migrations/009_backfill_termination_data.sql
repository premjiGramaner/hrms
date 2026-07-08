-- ============================================================================
-- Migration: Backfill Termination Data for Existing Deleted Employees
-- Purpose: Populate termination fields for employees that were deleted before
--          the termination tracking system was implemented
-- ============================================================================

-- Update all deleted employees that have NULL termination data
UPDATE tbl_appusers
SET 
  termination_date = COALESCE(termination_date, contract_end_date, updated_at::date, created_at::date),
  termination_reason = COALESCE(termination_reason, 'Employee Terminated'),
  termination_type = COALESCE(termination_type, 'Involuntary'),
  last_working_day = COALESCE(last_working_day, contract_end_date, updated_at::date, created_at::date),
  notice_period_days = COALESCE(notice_period_days, 0),
  exit_interview_completed = COALESCE(exit_interview_completed, FALSE),
  rehire_eligible = COALESCE(rehire_eligible, FALSE),
  termination_notes = COALESCE(
    termination_notes,
    CASE 
      WHEN comments IS NOT NULL AND TRIM(comments) != '' THEN comments
      WHEN note IS NOT NULL AND TRIM(note) != '' THEN note
      ELSE 'Legacy termination - terminated before tracking system was implemented'
    END
  ),
  terminated_by_user_id = COALESCE(
    terminated_by_user_id,
    CASE 
      WHEN updated_by IS NOT NULL AND updated_by ~ '^[0-9]+$' THEN updated_by::bigint
      WHEN created_by IS NOT NULL AND created_by ~ '^[0-9]+$' THEN created_by::bigint
      ELSE NULL
    END
  )
WHERE is_deleted = TRUE
  AND (
    termination_date IS NULL 
    OR termination_reason IS NULL 
    OR termination_type IS NULL
    OR last_working_day IS NULL
    OR termination_notes IS NULL
  );

-- Display summary of backfilled data
SELECT 
  COUNT(*) as total_backfilled,
  COUNT(CASE WHEN termination_date IS NOT NULL THEN 1 END) as has_termination_date,
  COUNT(CASE WHEN termination_reason IS NOT NULL THEN 1 END) as has_termination_reason,
  COUNT(CASE WHEN termination_type IS NOT NULL THEN 1 END) as has_termination_type,
  COUNT(CASE WHEN last_working_day IS NOT NULL THEN 1 END) as has_last_working_day,
  COUNT(CASE WHEN termination_notes IS NOT NULL THEN 1 END) as has_termination_notes
FROM tbl_appusers
WHERE is_deleted = TRUE;

