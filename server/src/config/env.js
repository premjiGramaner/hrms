import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

export const nodeEnv = process.env.NODE_ENV || 'development';
export const port = Number(process.env.PORT || 5000);
export const jwtSecret = process.env.JWT_SECRET || 'development-only-change-me';
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '8h';
export const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export default {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
