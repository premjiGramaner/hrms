-- Migration: add supervisor_email column to tbl_sub_units
-- This links a supervisor to a login account via their email address.
-- Run once against the hrms database.

ALTER TABLE tbl_sub_units
  ADD COLUMN IF NOT EXISTS supervisor_email VARCHAR(255);
