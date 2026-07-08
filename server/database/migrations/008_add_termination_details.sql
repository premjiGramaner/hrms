-- ============================================================================
-- Migration: Add Termination Details Tracking
-- Purpose: Capture detailed information when an employee is terminated
-- ============================================================================

-- Add termination tracking columns to tbl_appusers
ALTER TABLE tbl_appusers 
ADD COLUMN IF NOT EXISTS termination_date DATE,
ADD COLUMN IF NOT EXISTS termination_reason VARCHAR(500),
ADD COLUMN IF NOT EXISTS termination_type VARCHAR(50), -- Voluntary, Involuntary, Retirement, etc.
ADD COLUMN IF NOT EXISTS last_working_day DATE,
ADD COLUMN IF NOT EXISTS notice_period_days INTEGER,
ADD COLUMN IF NOT EXISTS exit_interview_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rehire_eligible BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS termination_notes TEXT,
ADD COLUMN IF NOT EXISTS terminated_by_user_id BIGINT REFERENCES tbl_appusers(id);

-- Add index for termination queries
CREATE INDEX IF NOT EXISTS idx_tbl_appusers_termination_date ON tbl_appusers(termination_date) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_tbl_appusers_is_deleted ON tbl_appusers(is_deleted);

-- Add comments for documentation
COMMENT ON COLUMN tbl_appusers.termination_date IS 'Official termination date when employment ended';
COMMENT ON COLUMN tbl_appusers.termination_reason IS 'Reason for termination (resignation, termination, retirement, etc.)';
COMMENT ON COLUMN tbl_appusers.termination_type IS 'Type: Voluntary, Involuntary, Retirement, Layoff, End of Contract';
COMMENT ON COLUMN tbl_appusers.last_working_day IS 'Last actual working day of the employee';
COMMENT ON COLUMN tbl_appusers.notice_period_days IS 'Number of days of notice period served';
COMMENT ON COLUMN tbl_appusers.exit_interview_completed IS 'Whether exit interview was conducted';
COMMENT ON COLUMN tbl_appusers.rehire_eligible IS 'Whether employee is eligible for rehire';
COMMENT ON COLUMN tbl_appusers.termination_notes IS 'Additional notes about termination';
COMMENT ON COLUMN tbl_appusers.terminated_by_user_id IS 'User ID of admin who terminated the employee';

-- ============================================================================
-- Sample termination data for testing (OPTIONAL - uncomment to use)
-- ============================================================================

-- Update existing deleted employees with sample termination data
-- UPDATE tbl_appusers
-- SET 
--   termination_date = updated_at::date,
--   termination_reason = 'Resignation',
--   termination_type = 'Voluntary',
--   last_working_day = updated_at::date,
--   notice_period_days = 30,
--   exit_interview_completed = FALSE,
--   rehire_eligible = TRUE
-- WHERE is_deleted = TRUE AND termination_date IS NULL;

-- ============================================================================
-- Rollback instructions (if needed)
-- ============================================================================
-- To rollback this migration:
-- 
-- ALTER TABLE tbl_appusers 
-- DROP COLUMN IF EXISTS termination_date,
-- DROP COLUMN IF EXISTS termination_reason,
-- DROP COLUMN IF EXISTS termination_type,
-- DROP COLUMN IF EXISTS last_working_day,
-- DROP COLUMN IF EXISTS notice_period_days,
-- DROP COLUMN IF EXISTS exit_interview_completed,
-- DROP COLUMN IF EXISTS rehire_eligible,
-- DROP COLUMN IF EXISTS termination_notes,
-- DROP COLUMN IF EXISTS terminated_by_user_id;
-- 
-- DROP INDEX IF EXISTS idx_tbl_appusers_termination_date;
-- DROP INDEX IF EXISTS idx_tbl_appusers_is_deleted;
