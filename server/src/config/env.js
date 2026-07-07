import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root (go up two levels: config -> src -> server)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("Missing required environment variable: JWT_SECRET");
}

export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "24h";
export const rememberMeDuration = process.env.REMEMBER_ME_DURATION || "30d";
export const clientBaseUrl =
  process.env.CLIENT_BASE_URL || process.env.FRONTEND_URL || "";
export const nodeEnv      = process.env.NODE_ENV;
export const port         = Number(process.env.PORT)        || 5001;
export const jwtSecret    = process.env.JWT_SECRET          || 'your-secret-key-change-this-in-production';
export const corsOrigins  = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
export const smtpUser     = process.env.SMTP_USER           || '';
export const smtpPass     = process.env.SMTP_PASS           || '';
export const mailFrom     = process.env.MAIL_FROM           || process.env.SMTP_USER || 'noreply@hrms.com';

export default { nodeEnv, port, jwtSecret, jwtExpiresIn, corsOrigins, smtpUser, smtpPass, mailFrom };
