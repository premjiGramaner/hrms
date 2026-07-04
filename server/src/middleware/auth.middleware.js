import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/env.js";
import AppError from "../utils/AppError.js";

const authenticate = (req, res, next) => {
  // Check for token in Authorization header first
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.auth_token) {
    // Fallback to cookie if no Authorization header
    token = req.cookies.auth_token;
  }

  if (!token) {
    return next(new AppError("Unauthorized", 401));
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return next(new AppError("Invalid or expired token", 401));
  }
};

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }
    next();
  };

export { authenticate, requireRole };
