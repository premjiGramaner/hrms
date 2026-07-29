-- Migration: Add description column to tbl_entitlement_history table
-- This allows storing entitlement descriptions entered during entitlement creation

ALTER TABLE tbl_entitlement_history
ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_entitlement_history_description ON tbl_entitlement_history(description);
