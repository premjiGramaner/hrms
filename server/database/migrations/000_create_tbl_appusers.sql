-- ============================================================================
-- Migration: Base users/employees table (tbl_appusers)
-- Purpose: Core table referenced by nearly every other migration and model.
--          Reconstructed from the columns used in src/models (employee.model.js
--          INSERT/SELECT/UPDATE) and the columns referenced by later migrations.
--
-- Columns added by later migrations are intentionally NOT defined here (they use
-- ADD COLUMN IF NOT EXISTS):
--   - supervisor_id, must_change_password, password_reset_token  -> 006_performance_and_supervisor_migration.sql
--   - is_first_login, password_reset_expires                     -> add_password_reset_columns.sql
--   - termination_* / terminated_by_user_id                      -> 008_add_termination_details.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS tbl_appusers (
  id                    BIGSERIAL PRIMARY KEY,

  -- Identity
  employee_id           VARCHAR(50),
  first_name            VARCHAR(150),
  middle_name           VARCHAR(150),
  last_name             VARCHAR(150),
  name                  VARCHAR(300),
  username              VARCHAR(150) UNIQUE,
  email                 VARCHAR(255),
  password              TEXT,
  role                  VARCHAR(50)  NOT NULL DEFAULT 'employee',
  status                VARCHAR(50)  DEFAULT 'Active',

  -- Personal details
  dob                   DATE,
  real_dob              DATE,
  nationality           VARCHAR(100),
  marital_status        VARCHAR(50),
  gender                VARCHAR(20),
  blood_group           VARCHAR(10),
  license_number        VARCHAR(100),
  license_expiry        DATE,

  -- Contact
  mobile                VARCHAR(30),
  home_tel              VARCHAR(30),
  work_tel              VARCHAR(30),
  other_email           VARCHAR(255),
  avatar                TEXT,

  -- Address
  address1              VARCHAR(255),
  address2              VARCHAR(255),
  city                  VARCHAR(100),
  country               VARCHAR(100),
  state                 VARCHAR(100),
  zip                   VARCHAR(20),

  -- Job details
  joined_date           DATE,
  location              VARCHAR(150),
  job_title             VARCHAR(150),
  employment_status     VARCHAR(100),
  job_specification     TEXT,
  job_category          VARCHAR(150),
  sub_unit              VARCHAR(150),
  attendance_calc       VARCHAR(100),
  probation_end_date    DATE,
  date_of_permanence    DATE,
  contract_start_date   DATE,
  contract_end_date     DATE,

  -- Misc / relationships
  comments              TEXT,
  note                  TEXT,
  supervisors           TEXT,          -- JSON array of supervisor ids stored as text

  -- Flags
  is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
  is_deleted            BOOLEAN      NOT NULL DEFAULT FALSE,

  -- Audit
  created_by            VARCHAR(50),
  updated_by            VARCHAR(50),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uix_appusers_employee_id
  ON tbl_appusers (employee_id)
  WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appusers_is_deleted ON tbl_appusers (is_deleted);
CREATE INDEX IF NOT EXISTS idx_appusers_is_active  ON tbl_appusers (is_active);
CREATE INDEX IF NOT EXISTS idx_appusers_email      ON tbl_appusers (LOWER(email));
