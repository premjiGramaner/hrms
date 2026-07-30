-- Keep report emails opt-in until an administrator explicitly saves the
-- notification configuration.

ALTER TABLE tbl_report_notification_config
  ALTER COLUMN is_active SET DEFAULT FALSE;

UPDATE tbl_report_notification_config
SET is_active = FALSE,
    updated_at = NOW()
WHERE updated_by IS NULL;
