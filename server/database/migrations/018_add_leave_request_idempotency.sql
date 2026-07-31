-- Enforce the canonical migration duplicate key for active leave requests.
-- Deleted requests do not block a later re-import.
CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_requests_active_business_key
  ON tbl_leave_requests (employee_id, leave_type_id, start_date, end_date)
  WHERE is_deleted = FALSE;
