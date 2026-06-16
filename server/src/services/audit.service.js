import pool from "../config/db.js";

/**
 * Insert a record into tbl_audit_log.
 *
 * @param {object} opts
 * @param {number|null} opts.employeeId       - id of the user/employee acted on
 * @param {string}      opts.employeeName     - name of that person
 * @param {string}      opts.employeeUsername - username of that person
 * @param {string}      opts.section          - role / section label (e.g. "employee", "hradmin")
 * @param {string}      opts.action           - CREATE | UPDATE | TERMINATE | DELETE
 * @param {object|null} opts.actor            - req.user object (the performer)
 * @param {string}      opts.source           - defaults to "Web Application"
 * @param {string}      opts.performedScreen  - defaults to "HR Administration"
 * @param {string}      opts.actionDescription
 */
export async function writeAuditLog({
  employeeId = null,
  employeeName = "",
  employeeUsername = "",
  section = "",
  action,
  actor = null,
  source = "Web Application",
  performedScreen = "HR Administration",
  actionDescription = "",
}) {
  try {
    const actorId = actor?.id ?? null;
    // actor.name is NOT in the JWT payload — only id and username are.
    // Resolve the real name from DB when we have a valid numeric id.
    let actorName = actor?.name ?? actor?.username ?? "System";
    let actorUsername = actor?.username ?? "system";

    if (actorId && actorId !== 0) {
      try {
        const { rows } = await pool.query(
          `SELECT name, username FROM tbl_appusers WHERE id = $1 AND is_deleted = false LIMIT 1`,
          [actorId],
        );
        if (rows.length > 0) {
          actorName = rows[0].name || rows[0].username || actorUsername;
          actorUsername = rows[0].username || actorUsername;
        }
      } catch {
        // keep the fallback values
      }
    } else if (actorId === 0) {
      actorName = "Admin";
      actorUsername = "admin";
    }

    await pool.query(
      `INSERT INTO tbl_audit_log
         (employee_id, employee_name, employee_username, section,
          action, actor_id, actor_name, actor_username,
          source, performed_screen, action_description, event_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [
        employeeId,
        employeeName,
        employeeUsername,
        section,
        action,
        actorId,
        actorName,
        actorUsername,
        source,
        performedScreen,
        actionDescription,
      ],
    );
  } catch (err) {
    // Audit failures should never break the main request – log and continue
    console.error("[audit] Failed to write audit log:", err.message);
  }
}
