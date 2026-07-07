UPDATE
    tbl_appusers
SET
    real_dob   = dob,
    updated_at = NOW()
WHERE
    real_dob IS NULL
AND dob IS NOT NULL
AND is_deleted = FALSE;
-- Display summary of the update
SELECT
    COUNT(*)      as employees_updated,
    MIN(real_dob) as earliest_birthday,
    MAX(real_dob) as latest_birthday
FROM
    tbl_appusers
WHERE
    real_dob IS NOT NULL
AND is_deleted = FALSE;
-- Verify: Show employees with birthdays now
SELECT
    id                                                                    ,
    employee_id                                                           ,
    COALESCE(name, CONCAT_WS(' ', first_name, last_name)) as full_name    ,
    dob                                                   as date_of_birth,
    real_dob                                              as real_birthday,
    TO_CHAR(real_dob, 'Month DD')                         as formatted_birthday
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND real_dob IS NOT NULL
ORDER BY
    EXTRACT(MONTH FROM real_dob),
    EXTRACT(DAY FROM real_dob)
LIMIT 10;
-- ============================================================================
-- Rollback Instructions (if needed)
-- ============================================================================
-- To rollback this migration (reset real_dob to NULL where it was copied from dob):
--
-- UPDATE tbl_appusers
-- SET real_dob = NULL
-- WHERE real_dob = dob AND dob IS NOT NULL;