import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { jwtSecret, jwtExpiresIn, rememberMeDuration } from "../config/env.js";
import { success, error } from "../utils/response.js";
import { getClientUrl } from "../utils/getClientUrl.js";
import {
  sendPasswordResetEmail,
  sendPasswordExpiredEmail,
  sendPasswordExpiryReminderEmail,
} from "../../email.service.js";
import {
  AUTH_MESSAGES,
  PASSWORD_POLICY_MESSAGES,
  PASSWORD_CONFIG,
} from "../constants/authMessages.js";
import { logError, logAuth, logEmail } from "../utils/logger.js";
import {
  getMicrosoftAuthUrl,
  completeMicrosoftAuth,
} from "../services/azureAd.service.js";
import {
  validateUsernameInAzureAd,
  isAzureAdConfigured,
} from "../services/azureAdPassword.service.js";

const signToken = (payload, expiresIn = jwtExpiresIn) =>
  jwt.sign(payload, jwtSecret, {
    expiresIn: expiresIn,
  });

const parseDuration = (duration) => {
  const match = duration.match(/^(\d+)([mhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;

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

function validatePasswordPolicy(password) {
  if (!password || password.length < PASSWORD_CONFIG.MIN_LENGTH) {
    return PASSWORD_POLICY_MESSAGES.MIN_LENGTH;
  }
  if (!/[a-z]/.test(password)) {
    return PASSWORD_POLICY_MESSAGES.REQUIRE_LOWERCASE;
  }
  if (!/[A-Z]/.test(password)) {
    return PASSWORD_POLICY_MESSAGES.REQUIRE_UPPERCASE;
  }
  if (!/[0-9]/.test(password)) {
    return PASSWORD_POLICY_MESSAGES.REQUIRE_NUMBER;
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return PASSWORD_POLICY_MESSAGES.REQUIRE_SPECIAL;
  }
  return "";
}

function createPlainResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function issuePasswordToken(userId) {
  const token = createPlainResetToken();
  const tokenHash = hashResetToken(token);
  await pool.query(
    `UPDATE tbl_appusers
     SET password_reset_token = $1,
         password_reset_expires = NOW() + INTERVAL '1 hour',
         updated_at = NOW()
     WHERE id = $2`,
    [tokenHash, userId],
  );
  return token;
}

const login = async (req, res, next) => {
  try {
    const { username, password, rememberMe } = req.body;
    if (!username || !password) {
      return error(res, AUTH_MESSAGES.CREDENTIALS_REQUIRED, 400);
    }

    const tokenExpiry = rememberMe ? rememberMeDuration : jwtExpiresIn;

    // HYBRID MODE: Validate username in Azure AD, but check password locally
    // EXCEPTION: Skip Azure AD validation for admin users (for testing/administration)
    let azureUserValidated = false;
    let azureUserEmail = null;
    const isAdminUser = username.toLowerCase() === 'admin' || username.toLowerCase() === 'administrator';

    if (isAzureAdConfigured() && !isAdminUser) {
      logAuth("Validating username in Azure AD (hybrid mode)", username, {
        method: "username_validation",
        ip: req.ip,
      });

      const azureValidation = await validateUsernameInAzureAd(username);

      if (azureValidation.exists) {
        azureUserValidated = true;
        azureUserEmail = azureValidation.email;

        logAuth("Username validated in Azure AD", username, {
          email: azureUserEmail,
          method: "hybrid_mode",
          ip: req.ip,
        });
      } else {
        logAuth("Username not found in Azure AD - login denied", username, {
          reason: azureValidation.error,
          ip: req.ip,
        });
        return error(
          res,
          "Authentication failed. Only @cannyfore.com users can access this system.",
          401,
        );
      }
    } else {
      // If Azure AD is not configured OR user is admin, allow fallback to local authentication
      if (isAdminUser) {
        logAuth("Admin user detected - skipping Azure AD validation", username, {
          ip: req.ip,
        });
      } else {
        logAuth("Azure AD not configured - using local authentication only", username, {
          ip: req.ip,
        });
      }
    }

    // Step 2: Query database to get user record
    const { rows } = await pool.query(
      `SELECT id, username, email, password, role, name, avatar, is_active, 
              must_change_password, password_changed_at, password_reminder_count, 
              last_password_reminder_at
       FROM tbl_appusers
       WHERE (username = $1 OR email = $1 ${azureUserEmail ? "OR email = $2" : ""}) 
       AND is_deleted = false`,
      azureUserEmail ? [username, azureUserEmail] : [username],
    );
    const user = rows[0];

    // Step 3: Validate user existence
    if (!user) {
      logAuth("Failed login attempt - user not found in database", username, {
        azureValidated: azureUserValidated,
        ip: req.ip,
      });
      return error(res, AUTH_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    // Step 4: Validate local password (always check database password)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logAuth("Failed login attempt - invalid password", username, {
        reason: "Invalid local password",
        userId: user.id,
        azureValidated: azureUserValidated,
        ip: req.ip,
      });
      return error(res, AUTH_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    // Step 5: Check if account is active
    if (!user.is_active) {
      logAuth("Login blocked - inactive account", user.username, {
        userId: user.id,
        email: user.email,
        authenticated: azureUserValidated ? "Hybrid (Azure AD + Local)" : "Local only",
        ip: req.ip,
      });
      return error(res, AUTH_MESSAGES.ACCOUNT_DEACTIVATED, 403);
    }

    const passwordAge = user.password_changed_at
      ? PASSWORD_CONFIG.USE_MINUTES_FOR_TESTING
        ? Math.floor(
            (Date.now() - new Date(user.password_changed_at).getTime()) /
              (1000 * 60),
          )
        : Math.floor(
            (Date.now() - new Date(user.password_changed_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
      : null;

    const expiryThreshold = PASSWORD_CONFIG.USE_MINUTES_FOR_TESTING
      ? PASSWORD_CONFIG.EXPIRY_MINUTES
      : PASSWORD_CONFIG.EXPIRY_DAYS;

    const warningThreshold = PASSWORD_CONFIG.USE_MINUTES_FOR_TESTING
      ? PASSWORD_CONFIG.WARNING_MINUTES
      : PASSWORD_CONFIG.WARNING_DAYS;

    const reminderInterval = PASSWORD_CONFIG.USE_MINUTES_FOR_TESTING
      ? PASSWORD_CONFIG.REMINDER_INTERVAL_MINUTES
      : PASSWORD_CONFIG.REMINDER_INTERVAL_DAYS;

    const timeUnit = PASSWORD_CONFIG.USE_MINUTES_FOR_TESTING
      ? "minutes"
      : "days";

    if (passwordAge !== null && passwordAge >= expiryThreshold) {
      logAuth("Password expired - forcing reset", user.username, {
        userId: user.id,
        passwordAge,
        passwordAgeUnit: timeUnit,
        lastChanged: user.password_changed_at,
        ip: req.ip,
        testingMode: PASSWORD_CONFIG.USE_MINUTES_FOR_TESTING,
      });

      res.clearCookie("auth_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      });

      const passwordSetupToken = await issuePasswordToken(user.id);
      const resetLink = `${getClientUrl(req)}/reset-password?token=${encodeURIComponent(passwordSetupToken)}`;

      try {
        await sendPasswordExpiredEmail({
          to: user.email,
          name: user.name || user.username,
          resetLink,
        });
        logEmail("Password expired email sent", user.email, {
          userId: user.id,
          username: user.username,
          passwordAge,
        });
      } catch (emailErr) {
        logError("Failed to send password expiry email", emailErr, {
          userId: user.id,
          username: user.username,
          email: user.email,
        });
      }

      return success(res, {
        requiresPasswordChange: true,
        passwordExpired: true,
        passwordSetupToken,
        message: AUTH_MESSAGES.PASSWORD_EXPIRED,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name || user.username,
          avatar: user.avatar,
        },
      });
    }

    if (user.must_change_password) {
      const passwordSetupToken = await issuePasswordToken(user.id);
      return success(res, {
        requiresPasswordChange: true,
        passwordSetupToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name || user.username,
          avatar: user.avatar,
        },
      });
    }

    let passwordReminderMessage = null;
    if (
      passwordAge !== null &&
      passwordAge >= warningThreshold &&
      passwordAge < expiryThreshold
    ) {
      const reminderCount = user.password_reminder_count || 0;
      const lastReminder = user.last_password_reminder_at
        ? new Date(user.last_password_reminder_at)
        : null;

      const timeSinceLastReminder = lastReminder
        ? PASSWORD_CONFIG.USE_MINUTES_FOR_TESTING
          ? Math.floor((Date.now() - lastReminder.getTime()) / (1000 * 60))
          : Math.floor(
              (Date.now() - lastReminder.getTime()) / (1000 * 60 * 60 * 24),
            )
        : 999;

      if (
        reminderCount < PASSWORD_CONFIG.MAX_REMINDERS &&
        timeSinceLastReminder >= reminderInterval
      ) {
        const timeLeft = expiryThreshold - passwordAge;
        passwordReminderMessage = `Your password will expire in ${timeLeft} ${timeUnit}${timeLeft !== 1 ? (timeUnit === "minutes" ? "" : "s") : ""}. Please change it soon.`;

        try {
          const changePasswordLink = `${getClientUrl(req)}/my-info`;
          const timeLeft = expiryThreshold - passwordAge;
          await sendPasswordExpiryReminderEmail({
            to: user.email,
            name: user.name || user.username,
            daysLeft: timeLeft,
            changePasswordLink,
          });
          logEmail("Password expiry reminder sent", user.email, {
            userId: user.id,
            username: user.username,
            timeLeft,
            timeUnit,
            reminderCount: reminderCount + 1,
            testingMode: PASSWORD_CONFIG.USE_MINUTES_FOR_TESTING,
          });
        } catch (emailErr) {
          logError("Failed to send password reminder email", emailErr, {
            userId: user.id,
            username: user.username,
            email: user.email,
            timeLeft: expiryThreshold - passwordAge,
            timeUnit,
          });
        }

        await pool.query(
          `UPDATE tbl_appusers 
           SET password_reminder_count = $1, 
               last_password_reminder_at = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [reminderCount + 1, user.id],
        );
      }
    }

    const token = signToken(
      {
        id: user.id,
        role: user.role,
        username: user.username,
      },
      tokenExpiry,
    );

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

    logAuth("Successful login", user.username, {
      userId: user.id,
      role: user.role,
      rememberMe,
      passwordAge: passwordAge || "N/A",
      reminderShown: !!passwordReminderMessage,
      authMethod: isAdminUser
        ? "Local only (admin exception)"
        : azureUserValidated 
        ? "Hybrid (Azure AD username + Local password)" 
        : "Local only",
      azureValidated: azureUserValidated,
      adminException: isAdminUser,
      ip: req.ip,
    });

    const passwordSetupToken = passwordReminderMessage
      ? await issuePasswordToken(user.id)
      : undefined;

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
      passwordReminderMessage,
      passwordSetupToken,
      authMethod: isAdminUser 
        ? "Local (admin)" 
        : azureUserValidated 
        ? "Hybrid (Azure AD + Local)" 
        : "Local",
    });
  } catch (err) {
    next(err);
  }
};

const self = async (req, res, next) => {
  try {
    if (!req.user) return error(res, AUTH_MESSAGES.UNAUTHORIZED, 401);

    const { rows } = await pool.query(
      `SELECT id, username, email, role, name, first_name, last_name,
              avatar, job_title, joined_date, sub_unit, status, mobile
       FROM tbl_appusers WHERE id = $1`,
      [req.user.id],
    );

    if (!rows[0]) return error(res, AUTH_MESSAGES.USER_NOT_FOUND, 404);

    return success(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const emailAddress = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (!emailAddress) return error(res, AUTH_MESSAGES.EMAIL_REQUIRED, 400);

    const { rows } = await pool.query(
      `SELECT id, name, username, email, is_active
       FROM tbl_appusers
       WHERE LOWER(email) = $1 AND is_deleted = false
       LIMIT 1`,
      [emailAddress],
    );
    const user = rows[0];

    if (user?.is_active) {
      const token = await issuePasswordToken(user.id);

      const resetLink = `${getClientUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;
      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name || user.username,
          resetLink,
        });
        logEmail("Password reset email sent", user.email, {
          userId: user.id,
          username: user.username,
          ip: req.ip,
        });
        logAuth("Password reset requested", user.username, {
          userId: user.id,
          email: user.email,
          ip: req.ip,
        });
      } catch (emailErr) {
        logError("Failed to send password reset email", emailErr, {
          userId: user.id,
          username: user.username,
          email: user.email,
        });
      }
    } else if (emailAddress) {
      logAuth(
        "Password reset attempted for non-existent/inactive account",
        emailAddress,
        {
          ip: req.ip,
        },
      );
    }

    return success(res, {
      message: AUTH_MESSAGES.EMAIL_SENT,
    });
  } catch (err) {
    next(err);
  }
};

const validateResetToken = async (token) => {
  const tokenHash = hashResetToken(token);
  const { rows } = await pool.query(
    `SELECT id, name
     FROM tbl_appusers
     WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND is_deleted = false
       AND is_active = true
     LIMIT 1`,
    [tokenHash],
  );

  return rows[0];
};

async function completePasswordReset(
  token,
  password,
  confirmPassword,
  oldPassword = null,
) {
  if (!token)
    return {
      errorMessage: AUTH_MESSAGES.TOKEN_INVALID,
      status: 400,
    };
  if (!password || !confirmPassword)
    return {
      errorMessage: PASSWORD_POLICY_MESSAGES.REQUIRED,
      status: 400,
    };
  if (password !== confirmPassword)
    return {
      errorMessage: PASSWORD_POLICY_MESSAGES.MISMATCH,
      status: 400,
    };
  const policyError = validatePasswordPolicy(password);
  if (policyError) return { errorMessage: policyError, status: 400 };

  const passwordHash = await bcrypt.hash(password, 10);
  const tokenHash = hashResetToken(token);

  const { rows } = await pool.query(
    `SELECT id, username, email, password FROM tbl_appusers 
     WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
       AND is_deleted = false
       AND is_active = true`,
    [tokenHash],
  );
  const user = rows[0];

  if (!user) {
    return {
      errorMessage: AUTH_MESSAGES.TOKEN_INVALID,
      status: 400,
    };
  }
  if (oldPassword) {
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      logAuth("Password reset failed - invalid old password", user.username, {
        userId: user.id,
        email: user.email,
      });
      return {
        errorMessage: "Current password is incorrect",
        status: 400,
      };
    }
  }
  const result = await pool.query(
    `UPDATE tbl_appusers
     SET password = $1,
         must_change_password = false,
         password_reset_token = NULL,
         password_reset_expires = NULL,
         password_changed_at = NOW(),
         password_reminder_count = 0,
         last_password_reminder_at = NULL,
         updated_at = NOW()
     WHERE password_reset_token = $2
       AND password_reset_expires > NOW()
       AND is_deleted = false
       AND is_active = true`,
    [passwordHash, tokenHash],
  );

  if (result.rowCount === 0) {
    return {
      errorMessage: AUTH_MESSAGES.TOKEN_INVALID,
      status: 400,
    };
  }

  logAuth("Password successfully reset", user.username, {
    userId: user.id,
    email: user.email,
    withOldPasswordVerification: !!oldPassword,
  });

  return { ok: true };
}

export const verifyToken = async (req, res, next) => {
  try {
    const user = await validateResetToken(req.body.token);
    if (!user) return error(res, AUTH_MESSAGES.TOKEN_INVALID, 400);

    return success(res, { message: "Token is valid.", data: { user } });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const result = await completePasswordReset(
      req.body.token,
      req.body.password,
      req.body.confirmPassword,
      req.body.oldPassword,
    );
    if (!result.ok) return error(res, result.errorMessage, result.status);
    return success(res, { message: AUTH_MESSAGES.PASSWORD_UPDATED });
  } catch (err) {
    next(err);
  }
};
const logout = async (req, res, next) => {
  try {
    const username = req.user?.username || "unknown";
    const userId = req.user?.id;

    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    });

    logAuth("User logged out", username, {
      userId,
      ip: req.ip,
    });

    return success(res, { message: AUTH_MESSAGES.LOGOUT_SUCCESS });
  } catch (err) {
    next(err);
  }
};

const microsoftLogin = async (req, res, next) => {
  try {
    const stateParameter = crypto.randomBytes(16).toString("hex");
    req.session = req.session || {};
    req.session.oauthState = stateParameter;

    const authorizationUrl = await getMicrosoftAuthUrl(stateParameter);
    return success(res, { authUrl: authorizationUrl });
  } catch (error) {
    logError("Failed to initiate Microsoft login", error);
    next(error);
  }
};

const microsoftCallback = async (req, res, next) => {
  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      logAuth("Microsoft OAuth error", "unknown", { error: oauthError });
      return res.redirect(
        `${getClientUrl(req)}/login?error=microsoft_auth_failed`,
      );
    }

    if (!code) {
      return res.redirect(
        `${getClientUrl(req)}/login?error=no_authorization_code`,
      );
    }

    const userProfileData = await completeMicrosoftAuth(code);

    const { rows: existingUsers } = await pool.query(
      `SELECT id, username, email, role, name, avatar, is_active, 
              must_change_password, password_changed_at
       FROM tbl_appusers
       WHERE LOWER(email) = $1 AND is_deleted = false`,
      [userProfileData.email.toLowerCase()],
    );

    let authenticatedUser = existingUsers[0];

    if (!authenticatedUser) {
      logAuth(
        "Microsoft login - User not found in system",
        userProfileData.email,
        {
          microsoftId: userProfileData.microsoftId,
          email: userProfileData.email,
        },
      );
      return res.redirect(
        `${getClientUrl(req)}/login?error=user_not_found&email=${encodeURIComponent(userProfileData.email)}`,
      );
    }

    if (!authenticatedUser.is_active) {
      logAuth(
        "Microsoft login blocked - inactive account",
        authenticatedUser.username,
        {
          userId: authenticatedUser.id,
          email: authenticatedUser.email,
        },
      );
      return res.redirect(
        `${getClientUrl(req)}/login?error=account_inactive`,
      );
    }

    const jwtToken = signToken(
      {
        id: authenticatedUser.id,
        role: authenticatedUser.role,
        username: authenticatedUser.username,
      },
      jwtExpiresIn,
    );

    const cookieMaxAge = parseDuration(jwtExpiresIn);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: cookieMaxAge,
    };

    res.cookie("auth_token", jwtToken, cookieOptions);

    logAuth("Successful Microsoft login", authenticatedUser.username, {
      userId: authenticatedUser.id,
      role: authenticatedUser.role,
      email: authenticatedUser.email,
      microsoftId: userProfileData.microsoftId,
    });

    return res.redirect(`${getClientUrl(req)}/employees?sso=success`);
  } catch (error) {
    logError("Microsoft callback error", error);
    return res.redirect(
      `${getClientUrl(req)}/login?error=authentication_failed`,
    );
  }
};

export {
  login,
  self,
  forgotPassword,
  resetPassword,
  logout,
  microsoftLogin,
  microsoftCallback,
};
