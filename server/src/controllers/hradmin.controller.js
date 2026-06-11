import pool from '../config/db.js';
import { success } from '../utils/response.js';

const getUsers = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, name, email, role, status, is_active
       FROM tbl_appusers WHERE is_deleted = false AND role = 'hradmin' ORDER BY created_at DESC`
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

const deactivateUser = async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE tbl_appusers SET is_active = false WHERE id = $1`,
      [parseInt(req.params.id)]
    );
    return success(res, { message: 'User deactivated' });
  } catch (err) { next(err); }
};

const getJobTitles = (_req, res) =>
  success(res, ['Software Consultant', 'HR Manager', 'Accountant', 'Team Lead', 'Director', 'Talent Acquisition Specialist']);

const getJobCategories = (_req, res) =>
  success(res, ['Delivery Team', 'Officials & Managers', 'Professionals', 'Sales Team', 'Support Function']);

const getAuditTrail = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, username, updated_at, updated_by, created_at, created_by
       FROM tbl_appusers ORDER BY updated_at DESC LIMIT 50`
    );
    return success(res, rows);
  } catch (err) { next(err); }
};

export { getUsers, deactivateUser, getJobTitles, getJobCategories, getAuditTrail };
