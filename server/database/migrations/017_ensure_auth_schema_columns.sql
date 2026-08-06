-- Migration: 017_ensure_auth_schema_columns.sql
-- Purpose: Ensure password reset and first-login columns exist on tbl_appusers.
-- These were previously created at runtime by ensureAuthSchema() in auth.controller.js.
-- Now handled as a proper migration for deployment-time execution.
-- Fully idempotent — safe to run multiple times.

ALTER TABLE tbl_appusers
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

ALTER TABLE tbl_appusers
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64);

ALTER TABLE tbl_appusers
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_appusers_password_reset_token
  ON tbl_appusers (password_reset_token)
  WHERE password_reset_token IS NOT NULL;
