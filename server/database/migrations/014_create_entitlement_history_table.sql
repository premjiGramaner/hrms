-- Migration: Create entitlement history table to track each individual entitlement addition
-- This allows tracking incremental entitlement additions rather than just the cumulative total

CREATE TABLE IF NOT EXISTS tbl_entitlement_history (
  id              SERIAL PRIMARY KEY,
  entitlement_id  INT          NOT NULL REFERENCES tbl_leave_entitlements(id) ON DELETE CASCADE,
  employee_id     BIGINT       NOT NULL REFERENCES tbl_appusers(id) ON DELETE CASCADE,
  leave_type_id   INT          NOT NULL REFERENCES tbl_leave_types(id) ON DELETE CASCADE,
  year            INT          NOT NULL,
  days_added      NUMERIC(5,1) NOT NULL,
  comments        TEXT,
  added_by        BIGINT       REFERENCES tbl_appusers(id),
  added_at        TIMESTAMP    DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_entitlement_history_entitlement_id ON tbl_entitlement_history(entitlement_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_history_employee_id ON tbl_entitlement_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_history_added_at ON tbl_entitlement_history(added_at DESC);

-- Backfill existing entitlements as initial history records
-- For each existing entitlement, create a history record showing the total_days as the initial addition
INSERT INTO tbl_entitlement_history (entitlement_id, employee_id, leave_type_id, year, days_added, comments, added_by, added_at)
SELECT 
  e.id,
  e.employee_id,
  e.leave_type_id,
  e.year,
  e.total_days,
  'Initial entitlement (backfilled)',
  NULL,
  e.created_at
FROM tbl_leave_entitlements e
WHERE e.is_deleted = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM tbl_entitlement_history h 
    WHERE h.entitlement_id = e.id
  );
