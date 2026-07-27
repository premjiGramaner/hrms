import pool from "../config/db.js";

export async function findEmployeesBySubUnitName(subUnitName) {
  const normalizedSubUnitName = subUnitName.trim();

  const { rows } = await pool.query(
    `SELECT
       id,
       employee_id,
       name,
       sub_unit
     FROM tbl_appusers
     WHERE is_deleted = FALSE
       AND is_active = TRUE
       AND LOWER(TRIM(sub_unit)) = LOWER($1)
     ORDER BY name ASC`,
    [normalizedSubUnitName],
  );

  return rows;
}
