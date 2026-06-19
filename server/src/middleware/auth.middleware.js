import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/env.js";
import AppError from "../utils/AppError.js";

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }

  const token = authHeader.split(" ")[1];
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
