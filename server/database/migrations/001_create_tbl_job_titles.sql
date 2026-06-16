CREATE TABLE IF NOT EXISTS tbl_job_titles (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(150) NOT NULL,
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uix_job_titles_title
  ON tbl_job_titles (LOWER(TRIM(title)));

INSERT INTO tbl_job_titles (title) VALUES
  ('Software Consultant'),
  ('HR Manager'),
  ('Accountant'),
  ('Team Lead'),
  ('Director'),
  ('Talent Acquisition Specialist')
ON CONFLICT DO NOTHING;
