import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { logError, logDatabase } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { Pool } = pg;
const requiredEnvVars = [
  "DATABASE_URL",
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingEnvVars.length > 0) {
  logError(`Missing environment variables: ${missingEnvVars.join(", ")}`);
  logError("Please check your .env file configuration");
}

// Prefer discrete DB_* connection fields when provided, since they are the
// authoritative credentials for this project. Fall back to DATABASE_URL only
// when the discrete fields are not fully configured.
const hasDiscreteConfig =
  process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME;

const poolConfig = hasDiscreteConfig
  ? {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }
  : {
    connectionString: process.env.DATABASE_URL.replace("{PASSWORD}", process.env.DB_PASSWORD),
  };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  logError("PostgreSQL pool error", err);
});

export default pool;
