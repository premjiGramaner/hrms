-- ============================================================
-- Reports and Analytics Module — Database Migration
-- ============================================================

-- 1. Report Notification Configuration
-- Stores HR admin email preferences for birthday/anniversary notifications
CREATE TABLE IF NOT EXISTS tbl_report_notification_config (
  id                          SERIAL PRIMARY KEY,
  notification_type           VARCHAR(50)   NOT NULL CHECK (notification_type IN ('birthday', 'work_anniversary')),
  recipient_user_ids          BIGINT[]      NOT NULL DEFAULT '{}',  -- Array of user IDs to receive notifications
  days_before                 INT           NOT NULL DEFAULT 2,      -- Days before event to send notification
  is_active                   BOOLEAN       DEFAULT TRUE,
  created_by                  BIGINT        REFERENCES tbl_appusers(id),
  updated_by                  BIGINT        REFERENCES tbl_appusers(id),
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(notification_type)
);

-- 2. Report Notification Log
-- Tracks sent notifications to avoid duplicates
CREATE TABLE IF NOT EXISTS tbl_report_notification_log (
  id                          BIGSERIAL PRIMARY KEY,
  notification_type           VARCHAR(50)   NOT NULL,
  employee_id                 BIGINT        NOT NULL REFERENCES tbl_appusers(id) ON DELETE CASCADE,
  event_date                  DATE          NOT NULL,
  sent_date                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  recipient_user_ids          BIGINT[]      NOT NULL,
  email_status                VARCHAR(30)   DEFAULT 'sent' CHECK (email_status IN ('sent', 'failed', 'pending')),
  error_message               TEXT,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_notification_log_employee ON tbl_report_notification_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_report_notification_log_event_date ON tbl_report_notification_log(event_date);
CREATE INDEX IF NOT EXISTS idx_report_notification_log_type ON tbl_report_notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_report_notification_log_sent_date ON tbl_report_notification_log(sent_date DESC);

-- Index for employee queries by date fields
CREATE INDEX IF NOT EXISTS idx_appusers_real_dob ON tbl_appusers(real_dob) WHERE is_deleted = FALSE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_appusers_joined_date ON tbl_appusers(joined_date) WHERE is_deleted = FALSE AND is_active = TRUE;

-- Seed default notification configuration
INSERT INTO tbl_report_notification_config (notification_type, recipient_user_ids, days_before, is_active)
VALUES 
  ('birthday', '{}', 2, TRUE),
  ('work_anniversary', '{}', 2, TRUE)
ON CONFLICT (notification_type) DO NOTHING; 
 