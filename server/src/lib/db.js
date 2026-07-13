import pg from "pg";
import dotenv from "dotenv";
import { logError } from "../utils/logger.js";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "hrms",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

pool.on("error", (err) => {
  logError("PostgreSQL pool error", err);
});

export default pool;
