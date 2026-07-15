import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }

    return msg;
  }),
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),

  new winston.transports.File({
    filename: path.join(__dirname, "../../logs/error.log"),
    level: "error",
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  new winston.transports.File({
    filename: path.join(__dirname, "../../logs/combined.log"),
    format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels,
  format,
  transports,
  exitOnError: false,
});

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

export const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

export const logError = (message, error = null, meta = {}) => {
  if (error instanceof Error) {
    logger.error(message, {
      error: {
        message: error.message,
        stack: error.stack,
        ...meta,
      },
    });
  } else {
    logger.error(message, { ...meta, error });
  }
};

export const logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

export const logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

export const logHttp = (message, meta = {}) => {
  logger.http(message, meta);
};

export const logDatabase = (operation, query = "", meta = {}) => {
  logger.debug(`[DATABASE] ${operation}`, { query, ...meta });
};

export const logEmail = (action, recipient = "", meta = {}) => {
  logger.info(`[EMAIL] ${action}`, { recipient, ...meta });
};

export const logAuth = (event, user = "", meta = {}) => {
  logger.info(`[AUTH] ${event}`, { user, ...meta });
};

export const logNotification = (event, meta = {}) => {
  logger.info(`[NOTIFICATION] ${event}`, meta);
};

export const logScheduler = (event, meta = {}) => {
  logger.info(`[SCHEDULER] ${event}`, meta);
};

export default logger;
