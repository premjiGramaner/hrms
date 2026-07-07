-- Migration: add password reset token columns and first-login flag
-- Run once against the hrms database

ALTER TABLE tbl_appusers
  ADD COLUMN IF NOT EXISTS is_first_login       BOOLEAN   NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS password_reset_token  TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Existing employees should NOT be forced through the first-login flow
UPDATE tbl_appusers SET is_first_login = FALSE WHERE is_first_login = TRUE;
