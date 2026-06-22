import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("Missing required environment variable: JWT_SECRET");
}

export const nodeEnv = process.env.NODE_ENV;
export const port = Number(process.env.PORT) || 5001;
export const jwtSecret =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "24h";
export const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export default { nodeEnv, port, jwtSecret, jwtExpiresIn, corsOrigins };
