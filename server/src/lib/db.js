import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hrms',
  user: 'postgres',
  password: 'Thangamani@',
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export default pool;
