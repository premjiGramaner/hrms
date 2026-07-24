-- Migration: 015_add_password_expiry_columns.sql
-- Purpose: Add password expiry tracking columns to tbl_appusers
-- Fully idempotent — safe to run against an existing database.

-- Add password_changed_at column to track when password was last changed
ALTER TABLE tbl_appusers 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Add password_reminder_count to track how many times user has been reminded
ALTER TABLE tbl_appusers 
ADD COLUMN IF NOT EXISTS password_reminder_count INT NOT NULL DEFAULT 0;

-- Add last_password_reminder_at to track when last reminder was shown
ALTER TABLE tbl_appusers 
ADD COLUMN IF NOT EXISTS last_password_reminder_at TIMESTAMPTZ;

-- Set initial password_changed_at for existing users who haven't changed their password
UPDATE tbl_appusers 
SET password_changed_at = created_at
WHERE password_changed_at IS NULL AND must_change_password = FALSE;

-- Create index for efficient password expiry queries
CREATE INDEX IF NOT EXISTS idx_appusers_password_changed_at 
ON tbl_appusers (password_changed_at) 
WHERE password_changed_at IS NOT NULL;

