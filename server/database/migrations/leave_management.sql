-- ============================================================
-- Leave Management Module — Database Migration
-- ============================================================

-- 1. Leave Types
CREATE TABLE IF NOT EXISTS tbl_leave_types (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL UNIQUE,
  code            VARCHAR(50)  NOT NULL UNIQUE,
  description     TEXT,
  max_days        NUMERIC(5,1) DEFAULT 0,
  carry_forward   BOOLEAN      DEFAULT FALSE,
  is_active       BOOLEAN      DEFAULT TRUE,
  is_deleted      BOOLEAN      DEFAULT FALSE,
  created_at      TIMESTAMP    DEFAULT NOW(),
  updated_at      TIMESTAMP    DEFAULT NOW()
);

-- Seed leave types
INSERT INTO tbl_leave_types (name, code, max_days, carry_forward) VALUES
  ('Carry Forward',             'CF',   30,  TRUE),
  ('Privileged Leave',          'PL',   18,  TRUE),
  ('Comp Off',                  'CO',   6,   FALSE),
  ('Leave of Interns',          'LI',   10,  FALSE),
  ('Loss of Pay',               'LOP',  0,   FALSE),
  ('Maternity Leave',           'ML',   180, FALSE),
  ('Paternity Leave',           'PTL',  15,  FALSE),
  ('Privilege',                 'PR',   12,  TRUE),
  ('Sick Leave',                'SL',   12,  FALSE),
  ('Work From Home',            'WFH',  60,  FALSE)
ON CONFLICT (code) DO NOTHING;

-- 2. Leave Entitlements (per employee per leave type per year)
CREATE TABLE IF NOT EXISTS tbl_leave_entitlements (
  id              SERIAL PRIMARY KEY,
  employee_id     BIGINT       NOT NULL REFERENCES tbl_appusers(id) ON DELETE CASCADE,
  leave_type_id   INT          NOT NULL REFERENCES tbl_leave_types(id) ON DELETE CASCADE,
  year            INT          NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  total_days      NUMERIC(5,1) NOT NULL DEFAULT 0,
  used_days       NUMERIC(5,1) NOT NULL DEFAULT 0,
  carried_days    NUMERIC(5,1) NOT NULL DEFAULT 0,
  is_deleted      BOOLEAN      DEFAULT FALSE,
  created_at      TIMESTAMP    DEFAULT NOW(),
  updated_at      TIMESTAMP    DEFAULT NOW(),
  UNIQUE (employee_id, leave_type_id, year)
);

-- 3. Leave Requests
CREATE TABLE IF NOT EXISTS tbl_leave_requests (
  id                  SERIAL PRIMARY KEY,
  employee_id         BIGINT        NOT NULL REFERENCES tbl_appusers(id) ON DELETE CASCADE,
  leave_type_id       INT           NOT NULL REFERENCES tbl_leave_types(id),
  start_date          DATE          NOT NULL,
  end_date            DATE          NOT NULL,
  requested_days      NUMERIC(5,1)  NOT NULL DEFAULT 1,
  reason              TEXT,
  status              VARCHAR(30)   NOT NULL DEFAULT 'Pending Approval'
                        CHECK (status IN ('Pending Approval','Approved','Rejected','Cancelled','Scheduled','Taken')),
  applied_on          TIMESTAMP     DEFAULT NOW(),
  approved_by         BIGINT        REFERENCES tbl_appusers(id),
  approved_on         TIMESTAMP,
  rejected_by         BIGINT        REFERENCES tbl_appusers(id),
  rejected_on         TIMESTAMP,
  rejection_reason    TEXT,
  cancelled_by        BIGINT        REFERENCES tbl_appusers(id),
  cancelled_on        TIMESTAMP,
  attachment_path     VARCHAR(500),
  attachment_status   VARCHAR(30)   DEFAULT 'Not Required'
                        CHECK (attachment_status IN ('Not Required','Pending','Available')),
  comments            TEXT,
  is_deleted          BOOLEAN       DEFAULT FALSE,
  created_at          TIMESTAMP     DEFAULT NOW(),
  updated_at          TIMESTAMP     DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee  ON tbl_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status    ON tbl_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates     ON tbl_leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_entitlements_emp   ON tbl_leave_entitlements(employee_id, year);
