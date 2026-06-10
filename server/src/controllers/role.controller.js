import pool from '../config/db.js';
import { success, created, error } from '../utils/response.js';

const listRoles = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, role_name, role_type, description, is_active
       FROM tbl_userroles WHERE is_deleted = false ORDER BY created_on DESC`
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const createRole = async (req, res, next) => {
  try {
    const { role_name, role_type, description } = req.body;
    if (!role_name) return error(res, 'role_name is required', 400);

    const { rows: existing } = await pool.query(
      `SELECT id FROM tbl_userroles WHERE role_name = $1 AND is_deleted = false`,
      [role_name]
    );
    if (existing.length) return error(res, 'Role name already exists', 422);

    const { rows } = await pool.query(
      `INSERT INTO tbl_userroles (role_name, role_type, description) VALUES ($1,$2,$3) RETURNING *`,
      [role_name, role_type || null, description || null]
    );
    return created(res, rows[0]);
  } catch (err) { next(err); }
};

const deleteRole = async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE tbl_userroles SET is_deleted = true WHERE id = $1`,
      [parseInt(req.params.id)]
    );
    return success(res, { message: 'Role deleted' });
  } catch (err) { next(err); }
};

export { listRoles, createRole, deleteRole };
