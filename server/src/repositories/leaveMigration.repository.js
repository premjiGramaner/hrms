const normalizeDateKey = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value ?? "").slice(0, 10);
};

const duplicateKey = (data) => [
  data.employee_id,
  data.leave_type_id,
  normalizeDateKey(data.start_date),
  normalizeDateKey(data.end_date),
].join("|");

export class LeaveMigrationRepository {
  constructor(existingDuplicates) {
    this.duplicates = existingDuplicates;
  }

  static async load(pool) {
    const { rows } = await pool.query(
      `SELECT employee_id, leave_type_id,
              start_date::text AS start_date, end_date::text AS end_date
       FROM tbl_leave_requests
       WHERE is_deleted=FALSE AND status NOT IN ('Rejected', 'Cancelled')`,
    );
    return new LeaveMigrationRepository(new Set(rows.map(duplicateKey)));
  }

  hasDuplicate(data) {
    return this.duplicates.has(duplicateKey(data));
  }

  async insert(client, data) {
    const key = duplicateKey(data);
    const values = [
      key,
      data.employee_id,
      data.leave_type_id,
      data.start_date,
      data.end_date,
      data.requested_days,
      data.reason,
      data.status,
      data.applied_on,
      data.approved_by,
      data.approved_on,
      data.rejection_reason,
      data.attachment_status,
      data.comments,
    ];
    const { rows } = await client.query(
      `WITH lock_guard AS (
         SELECT pg_advisory_xact_lock(hashtextextended($1, 0))
       ), existing AS (
         SELECT lr.id FROM tbl_leave_requests lr, lock_guard
         WHERE lr.employee_id=$2 AND lr.leave_type_id=$3
           AND lr.start_date=$4 AND lr.end_date=$5 AND lr.is_deleted=FALSE
           AND lr.status NOT IN ('Rejected', 'Cancelled')
         LIMIT 1
       ), inserted AS (
         INSERT INTO tbl_leave_requests
           (employee_id, leave_type_id, start_date, end_date, requested_days,
            reason, status, applied_on, approved_by, approved_on,
            rejection_reason, attachment_status, comments, is_deleted,
            created_at, updated_at)
         SELECT $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,FALSE,
                CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
         FROM lock_guard WHERE NOT EXISTS (SELECT 1 FROM existing)
         RETURNING id
       )
       SELECT id, TRUE AS inserted FROM inserted
       UNION ALL
       SELECT id, FALSE AS inserted FROM existing
       LIMIT 1`,
      values,
    );
    return rows[0] || null;
  }

  async markSkipped(client, rowId, message, issues, targetId = null) {
    await client.query(
      `UPDATE tbl_data_migration_rows
       SET status='SKIPPED', result_message=$2, validation_errors=$3::jsonb,
           target_record_id=$4, processed_at=NOW()
       WHERE id=$1`,
      [rowId, message, JSON.stringify(issues), targetId],
    );
  }

  async markInserted(client, rowId, targetId) {
    await client.query(
      `UPDATE tbl_data_migration_rows
       SET status='INSERTED', result_message='Leave request inserted',
           target_record_id=$2, processed_at=NOW()
       WHERE id=$1`,
      [rowId, targetId],
    );
  }
}
