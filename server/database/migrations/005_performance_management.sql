CREATE TABLE IF NOT EXISTS appraisal_templates (
  id              TEXT PRIMARY KEY,
  job_title       TEXT NOT NULL,
  template_name   TEXT NOT NULL,
  description     TEXT,
  weight          NUMERIC(8, 2) NOT NULL DEFAULT 100,
  header          TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appraisal_template_sections (
  id              TEXT PRIMARY KEY,
  template_id     TEXT NOT NULL REFERENCES appraisal_templates(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'KPIs',
  weight          NUMERIC(8, 2) NOT NULL DEFAULT 100,
  display_order   INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appraisal_template_kpis (
  id                  TEXT PRIMARY KEY,
  section_id           TEXT NOT NULL REFERENCES appraisal_template_sections(id) ON DELETE CASCADE,
  category             TEXT NOT NULL,
  title                TEXT NOT NULL,
  description          TEXT,
  display_text         TEXT NOT NULL,
  weight               NUMERIC(8, 2) DEFAULT 0,
  display_order        INTEGER NOT NULL,
  mandatory            BOOLEAN NOT NULL DEFAULT TRUE,
  rating_type          TEXT NOT NULL DEFAULT 'Rating Scale 0-5',
  comments_required    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appraisal_cycles (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  location        TEXT NOT NULL DEFAULT 'All',
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  due_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Created',
  template_id     TEXT NOT NULL REFERENCES appraisal_templates(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appraisal_cycle_employees (
  cycle_id            TEXT NOT NULL REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
  employee_id         BIGINT NOT NULL REFERENCES tbl_appusers(id) ON DELETE CASCADE,
  main_evaluator_id   BIGINT REFERENCES tbl_appusers(id),
  status              TEXT NOT NULL DEFAULT 'Not Created',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cycle_id, employee_id)
);

CREATE TABLE IF NOT EXISTS appraisals (
  id                    TEXT PRIMARY KEY,
  cycle_id              TEXT NOT NULL REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
  template_id            TEXT NOT NULL REFERENCES appraisal_templates(id),
  employee_id            BIGINT NOT NULL REFERENCES tbl_appusers(id) ON DELETE CASCADE,
  main_evaluator_id      BIGINT REFERENCES tbl_appusers(id),
  from_date              DATE NOT NULL,
  to_date                DATE NOT NULL,
  due_date               DATE NOT NULL,
  description            TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'INITIATED',
  self_weight            NUMERIC(8, 2) NOT NULL DEFAULT 50,
  supervisor_weight      NUMERIC(8, 2) NOT NULL DEFAULT 50,
  self_rating            NUMERIC(8, 2) NOT NULL DEFAULT 0,
  supervisor_rating      NUMERIC(8, 2) NOT NULL DEFAULT 0,
  self_submitted         BOOLEAN NOT NULL DEFAULT FALSE,
  supervisor_submitted   BOOLEAN NOT NULL DEFAULT FALSE,
  review_progress        INTEGER NOT NULL DEFAULT 0,
  final_rating           NUMERIC(8, 2),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, employee_id)
);

CREATE TABLE IF NOT EXISTS appraisal_ratings (
  id              BIGSERIAL PRIMARY KEY,
  appraisal_id    TEXT NOT NULL REFERENCES appraisals(id) ON DELETE CASCADE,
  question_id     TEXT NOT NULL REFERENCES appraisal_template_kpis(id) ON DELETE CASCADE,
  reviewer_type   TEXT NOT NULL CHECK (reviewer_type IN ('self', 'supervisor')),
  score           NUMERIC(8, 2) NOT NULL DEFAULT 0,
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appraisal_id, question_id, reviewer_type)
);

CREATE INDEX IF NOT EXISTS idx_appraisal_templates_job_title ON appraisal_templates (LOWER(TRIM(job_title)));
CREATE INDEX IF NOT EXISTS idx_appraisal_template_sections_template ON appraisal_template_sections (template_id);
CREATE INDEX IF NOT EXISTS idx_appraisal_template_kpis_section ON appraisal_template_kpis (section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_appraisal_cycles_status ON appraisal_cycles (status);
CREATE INDEX IF NOT EXISTS idx_appraisals_employee ON appraisals (employee_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_evaluator ON appraisals (main_evaluator_id);
