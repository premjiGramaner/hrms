-- Dedicated audit log table to capture full history of all user/employee actions
CREATE TABLE IF NOT EXISTS tbl_audit_log (
  id                  BIGSERIAL    PRIMARY KEY,
  employee_id         BIGINT,                          -- the user/employee that was acted on
  employee_name       VARCHAR(200),                    -- snapshot of name at time of action
  employee_username   VARCHAR(150),                    -- snapshot of username at time of action
  section             VARCHAR(100),                    -- role / section (e.g. 'employee', 'hradmin')
  action              VARCHAR(30)  NOT NULL,           -- CREATE | UPDATE | TERMINATE | DELETE
  actor_id            BIGINT,                          -- who performed the action
  actor_name          VARCHAR(200),                    -- snapshot of actor name
  actor_username      VARCHAR(150),                    -- snapshot of actor username
  source              VARCHAR(100) DEFAULT 'Web Application',
  performed_screen    VARCHAR(150) DEFAULT 'HR Administration',
  action_description  TEXT,
  event_time          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_time ON tbl_audit_log (event_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_employee_id ON tbl_audit_log (employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON tbl_audit_log (action);
