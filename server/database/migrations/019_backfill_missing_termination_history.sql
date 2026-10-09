-- ============================================================================
-- Migration: Backfill missing termination history records
-- Purpose: Populate tbl_employee_terminations for terminated employees that
--          were INSERTed directly (e.g. via data migration) rather than
--          UPDATEd, so the AFTER UPDATE trigger never fired.
-- ============================================================================

INSERT INTO tbl_employee_terminations (
  employee_id,
  employee_code,
  employee_name,
  employee_email,
  job_title,
  department,
  sub_unit,
  location,
  date_of_joining,
  supervisor_ids,
  supervisor_names,
  termination_date,
  termination_reason,
  termination_type,
  last_working_day,
  notice_period_days,
  exit_interview_completed,
  rehire_eligible,
  termination_notes,
  comments,
  terminated_by_user_id,
  terminated_by_name,
  created_at,
  updated_at,
  is_deleted
)
SELECT
  u.id,
  u.employee_id,
  COALESCE(u.name, CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name)),
  u.email,
  u.job_title,
  u.sub_unit,
  u.sub_unit,
  u.location,
  u.joined_date,
  u.supervisors,
  NULL, -- supervisor_names resolved below if needed
  COALESCE(u.termination_date, CURRENT_DATE),
  COALESCE(u.termination_reason, 'Employee Terminated'),
  COALESCE(u.termination_type, 'Involuntary'),
  COALESCE(u.last_working_day, u.termination_date, CURRENT_DATE),
  COALESCE(u.notice_period_days, 0),
  COALESCE(u.exit_interview_completed, FALSE),
  COALESCE(u.rehire_eligible, FALSE),
  u.termination_notes,
  u.comments,
  u.terminated_by_user_id,
  (SELECT COALESCE(t.name, CONCAT_WS(' ', t.first_name, t.last_name))
   FROM tbl_appusers t WHERE t.id = u.terminated_by_user_id),
  COALESCE(u.updated_at, NOW()),
  COALESCE(u.updated_at, NOW()),
  FALSE
FROM tbl_appusers u
WHERE u.is_deleted = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM tbl_employee_terminations t
    WHERE t.employee_id = u.id AND t.is_deleted = FALSE
  );
