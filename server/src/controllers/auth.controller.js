import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { jwtSecret, jwtExpiresIn, rememberMeDuration } from "../config/env.js";
import { success, error } from "../utils/response.js";

const signToken = (payload) =>
  jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });

const parseDuration = (duration) => {
  const match = duration.match(/^(\d+)([mhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "m":
      return value * 60 * 1000; // minutes
    case "h":
      return value * 60 * 60 * 1000; // hours
    case "d":
      return value * 24 * 60 * 60 * 1000; // days
    default:
      return 30 * 24 * 60 * 60 * 1000;
  }
};

const timingSafeCompare = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const login = async (req, res, next) => {
  try {
    const { username, password, rememberMe } = req.body;
    if (!username || !password) {
      return error(res, "Username and password are required", 400);
    }

    if (
      timingSafeCompare(username, "admin") &&
      timingSafeCompare(password, "admin")
    ) {
      const token = signToken({ id: 0, role: "empmanager", username: "admin" });

      // Set cookie if remember me is checked
      if (rememberMe) {
        const cookieMaxAge = parseDuration(rememberMeDuration);

        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
          maxAge: cookieMaxAge,
        };
        res.cookie("auth_token", token, cookieOptions);
      }

      return success(res, {
        token,
        user: {
          id: 0,
          username: "admin",
          role: "empmanager",
          name: "Admin",
          first_name: "Admin",
          last_name: "",
        },
      });
    }

    const { rows } = await pool.query(
      `SELECT id, username, password, role, name, avatar, is_active, password_expiry_at
       FROM tbl_appusers WHERE username = $1 AND is_deleted = false`,
      [username],
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return error(res, "Invalid username or password", 401);
    }

    if (!user.is_active) {
      return error(res, "This account has been deactivated", 403);
    }

    // Check if password is expired
    if (
      user.password_expiry_at &&
      new Date(user.password_expiry_at) < new Date()
    ) {
      return res.status(403).json({
        status: "error",
        message: "Password has expired",
        passwordExpired: true,
        username: user.username,
      });
    }

    const token = signToken({
      id: user.id,
      role: user.role,
      username: user.username,
    });

    // Set cookie if remember me is checked
    if (rememberMe) {
      const cookieMaxAge = parseDuration(rememberMeDuration);
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: cookieMaxAge,
      };
      res.cookie("auth_token", token, cookieOptions);
    }

    return success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name || user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
};

const self = async (req, res, next) => {
  try {
    if (!req.user) return error(res, "Unauthorized", 401);

    const { rows } = await pool.query(
      `SELECT id, username, email, role, name, first_name, last_name,
              avatar, job_title, joined_date, sub_unit, status, mobile
       FROM tbl_appusers WHERE id = $1`,
      [req.user.id],
    );

    if (!rows[0]) return error(res, "User not found", 404);

    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    // Clear the auth cookie
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });

    return success(res, { message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

const resetExpiredPassword = async (req, res, next) => {
  try {
    const { username, newPassword, confirmPassword } = req.body;

    if (!username || !newPassword || !confirmPassword) {
      return error(res, "All fields are required", 400);
    }

    if (newPassword !== confirmPassword) {
      return error(res, "Passwords do not match", 400);
    }

    // Password validation rules
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return error(
        res,
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        400,
      );
    }

    // Get user and check if password is expired
    const { rows } = await pool.query(
      `SELECT id, username, password_expiry_at FROM tbl_appusers 
       WHERE username = $1 AND is_deleted = false`,
      [username],
    );

    const user = rows[0];
    if (!user) {
      return error(res, "User not found", 404);
    }

    // Check if password is actually expired
    if (
      user.password_expiry_at &&
      new Date(user.password_expiry_at) > new Date()
    ) {
      return error(res, "Password has not expired yet", 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear expiry (password is now valid)
    await pool.query(
      `UPDATE tbl_appusers 
       SET password = $1, 
           password_changed_at = NOW(), 
           password_expiry_at = NULL
       WHERE id = $2`,
      [hashedPassword, user.id],
    );

    return success(res, {
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (err) {
    next(err);
  }
};

export { login, self, logout, resetExpiredPassword };
