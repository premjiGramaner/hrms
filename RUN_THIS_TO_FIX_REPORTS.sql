-- ============================================================================
-- COMPLETE FIX FOR REPORTS NOT SHOWING EMPLOYEES
-- Run this SQL file to fix all employees at once
-- ============================================================================
-- Step 1: Show current status BEFORE fix
SELECT
    '========== BEFORE FIX - Employee Status ==========' as status;
SELECT
    COUNT(*)           as total_active_employees,
    COUNT(dob)         as have_dob              ,
    COUNT(real_dob)    as have_real_dob_BEFORE  ,
    COUNT(joined_date) as have_joined_date      ,
    COUNT(
        CASE
            WHEN
                dob IS NOT NULL
            AND real_dob IS NULL
            THEN 1
        END)           as need_fixing
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE;
-- Step 2: Apply the fix - copy dob to real_dob
SELECT
    '========== APPLYING FIX ==========' as status;
UPDATE
    tbl_appusers
SET
    real_dob   = dob,
    updated_at = NOW()
WHERE
    is_deleted = FALSE
AND dob IS NOT NULL
AND real_dob IS NULL;
-- Step 3: Show status AFTER fix
SELECT
    '========== AFTER FIX - Employee Status ==========' as status;
SELECT
    COUNT(*)           as total_active_employees,
    COUNT(dob)         as have_dob              ,
    COUNT(real_dob)    as have_real_dob_AFTER   ,
    COUNT(joined_date) as have_joined_date      ,
    COUNT(
        CASE
            WHEN
                dob IS NOT NULL
            AND real_dob IS NULL
            THEN 1
        END)           as still_need_fixing
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE;
-- Step 4: Show employees that will appear in Birthday Report
SELECT
    '========== Birthday Report Candidates ==========' as status;
SELECT
    id                                                                ,
    employee_id                                                       ,
    COALESCE(name, CONCAT_WS(' ', first_name, last_name)) as full_name,
    TO_CHAR(real_dob, 'Month DD, YYYY')                   as birthday ,
    email                                                             ,
    job_title
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND real_dob IS NOT NULL
ORDER BY
    EXTRACT(MONTH FROM real_dob),
    EXTRACT(DAY FROM real_dob)
LIMIT 20;
-- Step 5: Show employees that will appear in Work Anniversary Report
SELECT
    '========== Work Anniversary Report Candidates ==========' as status;
SELECT
    id                                                                        ,
    employee_id                                                               ,
    COALESCE(name, CONCAT_WS(' ', first_name, last_name))  as full_name       ,
    TO_CHAR(joined_date, 'Month DD, YYYY')                 as join_date       ,
    DATE_PART('year', AGE(CURRENT_DATE, joined_date))::int as years_of_service,
    email                                                                     ,
    job_title
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND joined_date IS NOT NULL
ORDER BY
    joined_date DESC
LIMIT 20;
-- Step 6: Final summary
SELECT
    '========== FIX COMPLETE! ==========' as status;
SELECT
    'Birthday Report candidates: ' || COUNT(*) as message
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND real_dob IS NOT NULL

UNION ALL

SELECT
    'Work Anniversary Report candidates: ' || COUNT(*)
FROM
    tbl_appusers
WHERE
    is_deleted = FALSE
AND is_active  = TRUE
AND joined_date IS NOT NULL

UNION ALL

SELECT
    '✓ SQL Fix Applied - Now RESTART your server!' as message;
-- ============================================================================
-- NEXT STEPS AFTER RUNNING THIS SQL:
-- ============================================================================
-- 1. ✓ SQL fix applied (you just ran this file)
-- 2. → RESTART your server (npm start or node src/index.js)
-- 3. → Refresh Birthday Report page - employees should appear
-- 4. → Refresh Work Anniversary Report page - employees should appear
-- 5. → Test: Create a new employee - should appear automatically
-- ============================================================================