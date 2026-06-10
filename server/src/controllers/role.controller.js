const pool = require('../lib/db');

const listRoles = async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, role_name, role_type, description, is_active
     FROM tbl_userroles WHERE is_deleted = false ORDER BY created_on DESC`
  );
  res.json(rows);
};

const createRole = async (req, res) => {
  const { role_name, role_type, description } = req.body;
  if (!role_name) { res.status(400).json({ message: 'role_name is required' }); return; }

  const { rows: existing } = await pool.query(
    `SELECT id FROM tbl_userroles WHERE role_name = $1 AND is_deleted = false`, [role_name]
  );
  if (existing.length) { res.status(422).json({ message: 'Role name already exists' }); return; }

  const { rows } = await pool.query(
    `INSERT INTO tbl_userroles (role_name, role_type, description) VALUES ($1,$2,$3) RETURNING *`,
    [role_name, role_type || null, description || null]
  );
  res.status(201).json(rows[0]);
};

const deleteRole = async (req, res) => {
  await pool.query(
    `UPDATE tbl_userroles SET is_deleted = true WHERE id = $1`, [parseInt(req.params.id)]
  );
  res.json({ message: 'Role deleted' });
};

module.exports = { listRoles, createRole, deleteRole };
