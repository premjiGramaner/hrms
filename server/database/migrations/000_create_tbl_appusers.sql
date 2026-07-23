-- Migration: 000_create_tbl_appusers.sql
-- Purpose: Create the core users/employees table that every other table references.
-- Fully idempotent — safe to run against an existing database.

CREATE TABLE IF NOT EXISTS tbl_appusers (
  id                      BIGSERIAL     PRIMARY KEY,

  -- Identity
  employee_id             VARCHAR(50),
  first_name              VARCHAR(100),
  middle_name             VARCHAR(100),
  last_name               VARCHAR(100),
  name                    VARCHAR(200)  NOT NULL,
  username                VARCHAR(150)  NOT NULL UNIQUE,
  email                   VARCHAR(200)  NOT NULL UNIQUE,
  work_email              VARCHAR(200),
  other_email             VARCHAR(200),
  password                TEXT          NOT NULL,

  -- Role & Status
  role                    VARCHAR(50)   NOT NULL DEFAULT 'employee',
  status                  VARCHAR(30)   NOT NULL DEFAULT 'Active',
  is_active               BOOLEAN       NOT NULL DEFAULT TRUE,
  is_deleted              BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Personal
  dob                     DATE,
  real_dob                DATE,
  nationality             VARCHAR(100),
  marital_status          VARCHAR(50),
  gender                  VARCHAR(20),
  blood_group             VARCHAR(10),
  avatar                  TEXT,

  -- Contact
  mobile                  VARCHAR(30),
  home_tel                VARCHAR(30),
  work_tel                VARCHAR(30),

  -- Address
  address1                VARCHAR(255),
  address2                VARCHAR(255),
  city                    VARCHAR(100),
  country                 VARCHAR(100),
  state                   VARCHAR(100),
  zip                     VARCHAR(20),

  -- Employment
  joined_date             DATE,
  location                VARCHAR(100),
  job_title               VARCHAR(150),
  employment_status       VARCHAR(100),
  job_specification       TEXT,
  job_category            VARCHAR(100),
  sub_unit                VARCHAR(100),
  attendance_calc         VARCHAR(100),
  probation_end_date      DATE,
  date_of_permanence      DATE,
  contract_start_date     DATE,
  contract_end_date       DATE,
  comments                TEXT,

  -- License
  license_number          VARCHAR(100),
  license_expiry          DATE,

  -- Supervisor relationship (stored as JSON array of IDs)
  supervisors             TEXT,
  supervisor_names        TEXT,
  supervisor_id           INT,

  -- Auth / password management
  must_change_password    BOOLEAN       NOT NULL DEFAULT FALSE,
  is_first_login          BOOLEAN       NOT NULL DEFAULT TRUE,
  password_reset_token    TEXT,
  password_reset_expires  TIMESTAMPTZ,

  -- Termination
  termination_date        DATE,
  termination_reason      TEXT,
  termination_type        VARCHAR(100),
  last_working_day        DATE,
  notice_period_days      INT,
  exit_interview_completed BOOLEAN      DEFAULT FALSE,
  rehire_eligible         BOOLEAN       DEFAULT TRUE,
  termination_notes       TEXT,
  note       TEXT,

  -- Audit
  created_by              BIGINT,
  updated_by              BIGINT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appusers_role        ON tbl_appusers (role);
CREATE INDEX IF NOT EXISTS idx_appusers_status      ON tbl_appusers (status);
CREATE INDEX IF NOT EXISTS idx_appusers_is_active   ON tbl_appusers (is_active);
CREATE INDEX IF NOT EXISTS idx_appusers_employee_id ON tbl_appusers (employee_id);
CREATE INDEX IF NOT EXISTS idx_appusers_supervisor_id       ON tbl_appusers (supervisor_id);
CREATE INDEX IF NOT EXISTS idx_appusers_password_reset_token ON tbl_appusers (password_reset_token)
  WHERE password_reset_token IS NOT NULL;
