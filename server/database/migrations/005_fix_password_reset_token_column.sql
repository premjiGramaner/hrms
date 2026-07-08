-- Migration: widen password_reset_token from VARCHAR(64) to TEXT
-- The forgot-password flow stores a signed JWT (~200+ chars) which exceeds
-- the VARCHAR(64) limit, causing "value too long for type character varying(64)".
--
-- Run once against the hrms database:
--   psql -U postgres -d hrms -f 005_fix_password_reset_token_column.sql

ALTER TABLE tbl_appusers
  ALTER COLUMN password_reset_token TYPE TEXT;
