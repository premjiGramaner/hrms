CREATE TABLE IF NOT EXISTS tbl_sub_units (
  id              SERIAL PRIMARY KEY,
  sub_unit_name   VARCHAR(150)  NOT NULL,
  supervisor_name VARCHAR(150),
  description     TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uix_sub_units_name
  ON tbl_sub_units (LOWER(TRIM(sub_unit_name)));

INSERT INTO tbl_sub_units (sub_unit_name) VALUES
  ('Networking- IT Services'),
  ('Finance- IT Services'),
  ('Admin- IT Services'),
  ('HR- IT Services'),
  ('Delivery- IT Services'),
  ('Sales- IT Services')
ON CONFLICT DO NOTHING;
