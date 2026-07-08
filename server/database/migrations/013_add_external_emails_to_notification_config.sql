ALTER TABLE tbl_report_notification_config
    ADD COLUMN IF NOT EXISTS external_emails TEXT DEFAULT '';
COMMENT ON COLUMN tbl_report_notification_config.external_emails IS 'Comma-separated list of external email addresses (non-system users) to receive notifications';
SELECT
    'Notification config table updated'                       as status,
    'Added external_emails column for manual email addresses' as description;
SELECT
    notification_type ,
    recipient_user_ids,
    external_emails   ,
    days_before       ,
    is_active
FROM
    tbl_report_notification_config;