SELECT
    id                                                                    ,
    employee_id                                                           ,
    COALESCE(name, CONCAT_WS(' ', first_name, last_name)) as full_name    ,
    dob                                                   as date_of_birth,
    real_dob                                              as real_birthday,
    joined_date                                           as join_date    ,
    is_active                                                             ,
    is_deleted                                                            ,
    CASE
        WHEN
            dob IS NOT NULL
        THEN '✓'
        ELSE '✗'
    END                                                   as has_dob      ,
    CASE
        WHEN
            real_dob IS NOT NULL
        THEN '✓'
        ELSE '✗'
    END                                                   as has_real_dob ,
    CASE
        WHEN
            joined_date IS NOT NULL
        THEN '✓'
        ELSE '✗'
    END                                                   as has_joined_date
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
ORDER BY
    id DESC
LIMIT 20;
SELECT
    COUNT(*)           as total_active_employees,
    COUNT(dob)         as have_dob              ,
    COUNT(real_dob)    as have_real_dob         ,
    COUNT(joined_date) as have_joined_date      ,
    COUNT(
        CASE
            WHEN
                dob IS NOT NULL
            AND real_dob IS NULL
            THEN 1
        END)           as dob_without_real_dob  ,
    COUNT(
        CASE
            WHEN
                dob IS NOT NULL
            AND real_dob IS NOT NULL
            THEN 1
        END)           as have_both_dob_fields
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE;
SELECT
    'Birthday Report Candidates'                          as report_type,
    id                                                                  ,
    employee_id                                                         ,
    COALESCE(name, CONCAT_WS(' ', first_name, last_name)) as full_name  ,
    real_dob                                                            ,
    TO_CHAR(real_dob, 'Month DD, YYYY')                   as formatted_birthday
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND real_dob IS NOT NULL
ORDER BY
    real_dob DESC
LIMIT 10;
SELECT
    'Work Anniversary Report Candidates'                   as report_type        ,
    id                                                                           ,
    employee_id                                                                  ,
    COALESCE(name, CONCAT_WS(' ', first_name, last_name))  as full_name          ,
    joined_date                                                                  ,
    TO_CHAR(joined_date, 'Month DD, YYYY')                 as formatted_join_date,
    DATE_PART('year', AGE(CURRENT_DATE, joined_date))::int as years_of_service
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND joined_date IS NOT NULL
ORDER BY
    joined_date DESC
LIMIT 10;
SELECT
    'Need Manual Fix - Missing real_dob'                  as issue        ,
    id                                                                    ,
    employee_id                                                           ,
    COALESCE(name, CONCAT_WS(' ', first_name, last_name)) as full_name    ,
    dob                                                   as has_this_date,
    'NULL'                                                as real_dob_is
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND dob IS NOT NULL
AND real_dob IS NULL
LIMIT 10;