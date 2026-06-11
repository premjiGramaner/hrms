import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

export const nodeEnv = process.env.NODE_ENV ;
export const port = Number(process.env.PORT);
export const jwtSecret = process.env.JWT_SECRET ;
export const jwtExpiresIn = process.env.JWT_EXPIRES_IN;
export const corsOrigins = (process.env.CORS_ORIGINS )
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export default { nodeEnv, port, jwtSecret, jwtExpiresIn, corsOrigins };
