-- ============================================================================
-- Migration: Create Termination History Table with Trigger
-- Purpose: Store all employee termination records in a separate history table
--          Automatically populated when an employee is terminated
-- ============================================================================

-- Create the termination history table
CREATE TABLE IF NOT EXISTS tbl_employee_terminations (
  id BIGSERIAL PRIMARY KEY,
  
  -- Employee Reference
  employee_id BIGINT NOT NULL REFERENCES tbl_appusers(id),
  employee_code VARCHAR(50),
  employee_name VARCHAR(255) NOT NULL,
  employee_email VARCHAR(255),
  
  -- Employment Details (snapshot at termination)
  job_title VARCHAR(255),
  department VARCHAR(255),
  sub_unit VARCHAR(255),
  location VARCHAR(255),
  date_of_joining DATE,
  
  -- Supervisor Information
  supervisor_ids TEXT, -- JSON array of supervisor IDs
  supervisor_names TEXT, -- Comma-separated supervisor names
  
  -- Termination Details
  termination_date DATE NOT NULL,
  termination_reason VARCHAR(500) NOT NULL,
  termination_type VARCHAR(50) NOT NULL, -- Voluntary, Involuntary, Retirement, etc.
  last_working_day DATE,
  notice_period_days INTEGER DEFAULT 0,
  
  -- Exit Process
  exit_interview_completed BOOLEAN DEFAULT FALSE,
  exit_interview_date DATE,
  exit_interview_notes TEXT,
  
  -- Rehire Information
  rehire_eligible BOOLEAN DEFAULT FALSE,
  rehire_notes TEXT,
  
  -- Additional Information
  termination_notes TEXT,
  comments TEXT,
  
  -- Who performed the termination
  terminated_by_user_id BIGINT REFERENCES tbl_appusers(id),
  terminated_by_name VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Audit Trail
  audit_log_id BIGINT, -- Reference to audit log entry
  
  -- Soft delete for this table (in case we need to undo)
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,
  deleted_by BIGINT REFERENCES tbl_appusers(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_terminations_employee_id ON tbl_employee_terminations(employee_id);
CREATE INDEX IF NOT EXISTS idx_terminations_termination_date ON tbl_employee_terminations(termination_date);
CREATE INDEX IF NOT EXISTS idx_terminations_termination_type ON tbl_employee_terminations(termination_type);
CREATE INDEX IF NOT EXISTS idx_terminations_department ON tbl_employee_terminations(sub_unit);
CREATE INDEX IF NOT EXISTS idx_terminations_location ON tbl_employee_terminations(location);
CREATE INDEX IF NOT EXISTS idx_terminations_is_deleted ON tbl_employee_terminations(is_deleted);

-- Add comments for documentation
COMMENT ON TABLE tbl_employee_terminations IS 'Historical record of all employee terminations';
COMMENT ON COLUMN tbl_employee_terminations.employee_id IS 'Foreign key to tbl_appusers - the terminated employee';
COMMENT ON COLUMN tbl_employee_terminations.termination_date IS 'Official date of termination';
COMMENT ON COLUMN tbl_employee_terminations.termination_reason IS 'Reason for termination';
COMMENT ON COLUMN tbl_employee_terminations.termination_type IS 'Type: Voluntary, Involuntary, Retirement, Layoff, End of Contract';
COMMENT ON COLUMN tbl_employee_terminations.last_working_day IS 'Last actual working day';
COMMENT ON COLUMN tbl_employee_terminations.exit_interview_completed IS 'Whether exit interview was conducted';
COMMENT ON COLUMN tbl_employee_terminations.rehire_eligible IS 'Whether employee is eligible for future rehire';
COMMENT ON COLUMN tbl_employee_terminations.terminated_by_user_id IS 'User ID of person who terminated the employee';

-- ============================================================================
-- Create Function to Auto-Create Termination Record
-- ============================================================================

CREATE OR REPLACE FUNCTION create_termination_record()
RETURNS TRIGGER AS $$
DECLARE
  supervisor_names_text TEXT;
  terminated_by_name_text VARCHAR(255);
BEGIN
  -- Only create termination record if employee is being marked as deleted
  IF NEW.is_deleted = TRUE AND (OLD.is_deleted = FALSE OR OLD.is_deleted IS NULL) THEN
    
    -- Get supervisor names
    SELECT STRING_AGG(COALESCE(s.name, CONCAT_WS(' ', s.first_name, s.last_name)), ', ')
    INTO supervisor_names_text
    FROM UNNEST(
      CASE 
        WHEN NEW.supervisors IS NULL OR TRIM(NEW.supervisors) = '' THEN ARRAY[]::bigint[]
        ELSE (
          SELECT ARRAY_AGG(NULLIF(TRIM(elem::text), '')::bigint)
          FROM jsonb_array_elements_text(NEW.supervisors::jsonb) AS elem
          WHERE TRIM(elem::text) ~ '^[0-9]+$'
        )
      END
    ) AS supervisor_id
    LEFT JOIN tbl_appusers s ON s.id = supervisor_id AND s.is_deleted = FALSE;
    
    -- Get terminated by name
    SELECT COALESCE(t.name, CONCAT_WS(' ', t.first_name, t.last_name))
    INTO terminated_by_name_text
    FROM tbl_appusers t
    WHERE t.id = NEW.terminated_by_user_id;
    
    -- If terminated_by is NULL, try to get from updated_by
    IF terminated_by_name_text IS NULL AND NEW.updated_by IS NOT NULL THEN
      IF NEW.updated_by ~ '^[0-9]+$' THEN
        SELECT COALESCE(t.name, CONCAT_WS(' ', t.first_name, t.last_name))
        INTO terminated_by_name_text
        FROM tbl_appusers t
        WHERE t.id = NEW.updated_by::bigint;
      END IF;
    END IF;
    
    -- Insert termination record
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
      exit_interview_date,
      exit_interview_notes,
      rehire_eligible,
      rehire_notes,
      termination_notes,
      comments,
      terminated_by_user_id,
      terminated_by_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.employee_id,
      COALESCE(NEW.name, CONCAT_WS(' ', NEW.first_name, NEW.middle_name, NEW.last_name)),
      NEW.email,
      NEW.job_title,
      NEW.sub_unit, -- Used as department
      NEW.sub_unit,
      NEW.location,
      NEW.joined_date,
      NEW.supervisors,
      supervisor_names_text,
      COALESCE(NEW.termination_date, CURRENT_DATE),
      COALESCE(NEW.termination_reason, 'Employee Terminated'),
      COALESCE(NEW.termination_type, 'Involuntary'),
      COALESCE(NEW.last_working_day, NEW.termination_date, CURRENT_DATE),
      COALESCE(NEW.notice_period_days, 0),
      COALESCE(NEW.exit_interview_completed, FALSE),
      NULL, -- exit_interview_date
      NULL, -- exit_interview_notes
      COALESCE(NEW.rehire_eligible, FALSE),
      NULL, -- rehire_notes
      NEW.termination_notes,
      NEW.comments,
      NEW.terminated_by_user_id,
      terminated_by_name_text,
      NOW(),
      NOW()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create termination record
DROP TRIGGER IF EXISTS trigger_create_termination_record ON tbl_appusers;
CREATE TRIGGER trigger_create_termination_record
  AFTER UPDATE ON tbl_appusers
  FOR EACH ROW
  EXECUTE FUNCTION create_termination_record();

-- ============================================================================
-- Backfill Existing Terminations into History Table
-- ============================================================================

-- Insert all existing terminated employees into the history table
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
  updated_at
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
  (
    SELECT STRING_AGG(COALESCE(s.name, CONCAT_WS(' ', s.first_name, s.last_name)), ', ')
    FROM UNNEST(
      CASE 
        WHEN u.supervisors IS NULL OR TRIM(u.supervisors) = '' THEN ARRAY[]::bigint[]
        ELSE (
          SELECT ARRAY_AGG(NULLIF(TRIM(elem::text), '')::bigint)
          FROM jsonb_array_elements_text(u.supervisors::jsonb) AS elem
          WHERE TRIM(elem::text) ~ '^[0-9]+$'
        )
      END
    ) AS supervisor_id
    LEFT JOIN tbl_appusers s ON s.id = supervisor_id AND s.is_deleted = FALSE
  ) as supervisor_names,
  COALESCE(u.termination_date, u.updated_at::date),
  COALESCE(u.termination_reason, 'Employee Terminated'),
  COALESCE(u.termination_type, 'Involuntary'),
  COALESCE(u.last_working_day, u.termination_date, u.updated_at::date),
  COALESCE(u.notice_period_days, 0),
  COALESCE(u.exit_interview_completed, FALSE),
  COALESCE(u.rehire_eligible, FALSE),
  u.termination_notes,
  u.comments,
  u.terminated_by_user_id,
  (
    SELECT COALESCE(t.name, CONCAT_WS(' ', t.first_name, t.last_name))
    FROM tbl_appusers t
    WHERE t.id = u.terminated_by_user_id
  ),
  u.updated_at,
  u.updated_at
FROM tbl_appusers u
WHERE u.is_deleted = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM tbl_employee_terminations t 
    WHERE t.employee_id = u.id AND t.is_deleted = FALSE
  );

-- ============================================================================
-- Display Summary
-- ============================================================================

SELECT 
  COUNT(*) as total_termination_records,
  COUNT(DISTINCT employee_id) as unique_employees,
  MIN(termination_date) as earliest_termination,
  MAX(termination_date) as latest_termination
FROM tbl_employee_terminations
WHERE is_deleted = FALSE;

-- ============================================================================
-- Rollback Instructions (if needed)
-- ============================================================================
-- To rollback this migration:
-- 
-- DROP TRIGGER IF EXISTS trigger_create_termination_record ON tbl_appusers;
-- DROP FUNCTION IF EXISTS create_termination_record();
-- DROP TABLE IF EXISTS tbl_employee_terminations CASCADE;
