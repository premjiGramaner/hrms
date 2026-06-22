import { nodeEnv } from "../config/env.js";

const errorMiddleware = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && nodeEnv === "production"
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  if (nodeEnv !== "production") {
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message });
};

export default errorMiddleware;
