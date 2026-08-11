import pg from "pg";
import bcrypt from "bcryptjs";
import { ROLES } from "./src/constants/roles.js"
import { defaultPassword } from "./src/config/env.js";

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createDefaultUser() {
  const client = await pool.connect();
  try {
    const username = "admin";
    const existingUser = await client.query(
      `SELECT id FROM tbl_appusers WHERE username = $1`,
      [username],
    );

    if (existingUser.rows.length > 0) {
      console.log("Default admin user already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await client.query(
      `
      INSERT INTO tbl_appusers
      (
        name,
        username,
        email,
        password,
        role,
        status,
        employee_id,
        is_active,
        is_deleted,
        must_change_password,
        is_first_login,
        created_at,
        updated_at
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        'Active',
        0,
        TRUE,
        FALSE,
        FALSE,
        FALSE,
        NOW(),
        NOW()
      )
      `,
      [
        "Administrator",
        "admin",
        "admin@gmail.com",
        passwordHash,
        ROLES.HR_ADMIN,
      ],
    );
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

createDefaultUser();
