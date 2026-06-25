-- Add supervisor_id column to tbl_appusers
-- This allows storing supervisor information as a direct foreign key instead of JSON array

ALTER TABLE tbl_appusers 
ADD COLUMN supervisor_id INT;

-- Create index for supervisor_id for better query performance
CREATE INDEX idx_appusers_supervisor_id ON tbl_appusers(supervisor_id);
