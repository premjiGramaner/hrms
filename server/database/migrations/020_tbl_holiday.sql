CREATE TABLE IF NOT EXISTS tbl_holiday_matrix (
    id        BIGSERIAL  PRIMARY KEY,
    title     VARCHAR(200)  NOT NULL,
    holiday_date  DATE      NOT NULL,
    day_name    VARCHAR(50)  NOT NULL,
    is_bangalore  BOOLEAN    NOT NULL DEFAULT FALSE,
    is_coimbatore  BOOLEAN    NOT NULL DEFAULT FALSE,
    is_hyderabad   BOOLEAN    NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    update_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_holiday_matrix_data ON tbl_holiday_matrix (holiday_date ASC)