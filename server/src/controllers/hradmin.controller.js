const pool = require('../lib/db');

const getUsers = async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, name, email, role, status, is_active
     FROM tbl_appusers WHERE is_deleted = false ORDER BY created_on DESC`
  );
  res.json(rows);
};

const deactivateUser = async (req, res) => {
  await pool.query(
    `UPDATE tbl_appusers SET is_active = false WHERE id = $1`, [parseInt(req.params.id)]
  );
  res.json({ message: 'User deactivated' });
};

const getJobTitles = (_req, res) => {
  res.json(['Software Consultant', 'HR Manager', 'Accountant', 'Team Lead', 'Director', 'Talent Acquisition Specialist']);
};

const getJobCategories = (_req, res) => {
  res.json(['Delivery Team', 'Officials & Managers', 'Professionals', 'Sales Team', 'Support Function']);
};

const getAuditTrail = async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, username, updated_on, updated_by, created_on, created_by
     FROM tbl_appusers ORDER BY updated_on DESC LIMIT 50`
  );
  res.json(rows);
};

module.exports = { getUsers, deactivateUser, getJobTitles, getJobCategories, getAuditTrail };
