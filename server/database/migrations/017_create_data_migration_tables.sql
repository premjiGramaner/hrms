CREATE TABLE IF NOT EXISTS tbl_data_migrations (
  id BIGSERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash CHAR(64) NOT NULL,
  uploaded_by BIGINT,
  uploaded_by_name VARCHAR(200),
  status VARCHAR(40) NOT NULL DEFAULT 'VALIDATING',
  overwrite_existing BOOLEAN NOT NULL DEFAULT FALSE,
  total_sheets INTEGER NOT NULL DEFAULT 0,
  total_records INTEGER NOT NULL DEFAULT 0,
  valid_records INTEGER NOT NULL DEFAULT 0,
  invalid_records INTEGER NOT NULL DEFAULT 0,
  duplicate_records INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  processed_records INTEGER NOT NULL DEFAULT 0,
  inserted_records INTEGER NOT NULL DEFAULT 0,
  updated_records INTEGER NOT NULL DEFAULT 0,
  skipped_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  current_sheet VARCHAR(255),
  current_row INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_migrations_created
  ON tbl_data_migrations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_migrations_uploader
  ON tbl_data_migrations (uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_migrations_hash
  ON tbl_data_migrations (file_hash);

CREATE TABLE IF NOT EXISTS tbl_data_migration_rows (
  id BIGSERIAL PRIMARY KEY,
  migration_id BIGINT NOT NULL REFERENCES tbl_data_migrations(id) ON DELETE CASCADE,
  sheet_name VARCHAR(255) NOT NULL,
  sheet_order INTEGER NOT NULL,
  source_row INTEGER NOT NULL,
  entity_type VARCHAR(80),
  target_table VARCHAR(100),
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_message TEXT,
  target_record_id BIGINT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (migration_id, sheet_name, source_row)
);

CREATE INDEX IF NOT EXISTS idx_data_migration_rows_job_status
  ON tbl_data_migration_rows (migration_id, status, id);
CREATE INDEX IF NOT EXISTS idx_data_migration_rows_job_sheet
  ON tbl_data_migration_rows (migration_id, sheet_order, source_row);
