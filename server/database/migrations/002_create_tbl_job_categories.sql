CREATE TABLE IF NOT EXISTS tbl_job_categories (
  id          SERIAL PRIMARY KEY,
  category    VARCHAR(150) NOT NULL,
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uix_job_categories_category
  ON tbl_job_categories (LOWER(TRIM(category)));

INSERT INTO tbl_job_categories (category) VALUES
  ('Delivery Team'),
  ('Officials & Managers'),
  ('Professionals'),
  ('Sales Team'),
  ('Support Function')
ON CONFLICT DO NOTHING;
