ALTER TABLE tbl_leave_requests 
ADD COLUMN IF NOT EXISTS net_leave_balance_at_request NUMERIC(5,2);

-- Backfill existing records with current calculated balance
UPDATE tbl_leave_requests lr
SET net_leave_balance_at_request = (
  SELECT (COALESCE(e.total_days, 0) + COALESCE(e.carried_days, 0) - COALESCE(e.used_days, 0))
  FROM tbl_leave_entitlements e
  WHERE e.employee_id = lr.employee_id
    AND e.leave_type_id = lr.leave_type_id
    AND e.year = CASE 
      WHEN EXTRACT(MONTH FROM lr.start_date) >= 4 
      THEN EXTRACT(YEAR FROM lr.start_date) + 1
      ELSE EXTRACT(YEAR FROM lr.start_date)
    END
    AND e.is_deleted = FALSE
  LIMIT 1
)
WHERE net_leave_balance_at_request IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN tbl_leave_requests.net_leave_balance_at_request IS 
'Stores the net leave balance at the time the leave request was created. This is a snapshot and should not be recalculated.';
