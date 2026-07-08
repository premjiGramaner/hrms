
UPDATE
    tbl_appusers
SET
    real_dob   = dob,
    updated_at = NOW()
WHERE
    is_deleted = FALSE
AND dob IS NOT NULL
AND real_dob IS NULL;
-- Display what was updated
SELECT
    id                                                                ,
    employee_id                                                       ,
    COALESCE(name, CONCAT_WS(' ', first_name, last_name)) as full_name,
    dob                                                               ,
    real_dob                                                          ,
    joined_date                                                       ,
    'Updated'                                             as status
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND real_dob   = dob -- Shows employees where real_dob was just copied from dob
ORDER BY
    updated_at DESC
LIMIT 10;
-- Verify Birthday Report candidates
SELECT
    COUNT(*) as birthday_report_count
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND real_dob IS NOT NULL;
-- Verify Work Anniversary Report candidates
SELECT
    COUNT(*) as work_anniversary_report_count
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND joined_date IS NOT NULL;