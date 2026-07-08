-- ============================================================================
-- Migration: Fix Ambiguous Column Reference in Termination Trigger
-- Purpose: Fix "column reference supervisor_id is ambiguous" error
-- ============================================================================

-- Drop and recreate the trigger function with fixed column aliasing
CREATE OR REPLACE FUNCTION create_termination_record()
RETURNS TRIGGER AS $$
DECLARE
  supervisor_names_text TEXT;
  terminated_by_name_text VARCHAR(255);
BEGIN
  -- Only create termination record if employee is being marked as deleted
  IF NEW.is_deleted = TRUE AND (OLD.is_deleted = FALSE OR OLD.is_deleted IS NULL) THEN
    
    -- Get supervisor names (FIXED: added proper aliasing to avoid ambiguity)
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
    ) AS sup_id  -- Changed from supervisor_id to sup_id to avoid ambiguity
    LEFT JOIN tbl_appusers s ON s.id = sup_id AND s.is_deleted = FALSE;
    
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

-- Recreate the trigger (function is already updated, trigger remains the same)
DROP TRIGGER IF EXISTS trigger_create_termination_record ON tbl_appusers;
CREATE TRIGGER trigger_create_termination_record
  AFTER UPDATE ON tbl_appusers
  FOR EACH ROW
  EXECUTE FUNCTION create_termination_record();

-- Test message
SELECT 'Termination trigger function updated successfully - supervisor_id ambiguity fixed' AS status;
