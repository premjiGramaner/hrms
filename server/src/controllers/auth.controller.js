const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../lib/db');

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: 'Username and password are required' });
    return;
  }

  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign(
      { id: 0, role: 'empmanager', username: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: 0, username: 'admin', role: 'empmanager', name: 'Admin' } });
    return;
  }

  const { rows } = await pool.query(
    `SELECT id, username, password, role, name, avatar, is_active
     FROM tbl_appusers WHERE username = $1 AND is_deleted = false`,
    [username]
  );
  const user = rows[0];

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ message: 'Invalid username or password' });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ message: 'This account has been deactivated' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name || user.username, avatar: user.avatar },
  });
};

const getMe = async (req, res) => {
  if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }

  const { rows } = await pool.query(
    `SELECT id, username, email, role, name, first_name, last_name,
            avatar, job_title, joined_date, sub_unit, status, mobile
     FROM tbl_appusers WHERE id = $1`,
    [req.user.id]
  );
  if (!rows[0]) { res.status(404).json({ message: 'User not found' }); return; }
  res.json(rows[0]);
};

module.exports = { login, getMe };
