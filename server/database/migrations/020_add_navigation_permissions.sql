ALTER TABLE tbl_appusers
  ADD COLUMN IF NOT EXISTS navigation_permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
