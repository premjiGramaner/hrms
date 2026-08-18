// STRICT AZURE AD ONLY - NO LOCAL FALLBACK
// Replace the login function in auth.controller.js with this version

const login = async (req, res, next) => {
  try {
    const { username, password, rememberMe } = req.body;
    if (!username || !password) {
      return error(res, AUTH_MESSAGES.CREDENTIALS_REQUIRED, 400);
    }

    const tokenExpiry = rememberMe ? rememberMeDuration : jwtExpiresIn;

    // STRICT MODE: Only try Azure AD, no fallback
    if (!isAzureAdConfigured()) {
      return error(res, "Azure AD authentication is required but not configured", 500);
    }

    logAuth("Attempting Azure AD authentication (STRICT MODE)", username, {
      method: "username_password",
      ip: req.ip,
    });

    // Try Azure AD authentication
    const azureResult = await authenticateWithPassword(username, password);

    if (!azureResult.success) {
      logAuth("Azure AD authentication failed - NO FALLBACK", username, {
        reason: azureResult.error,
        ip: req.ip,
      });
      return error(res, AUTH_MESSAGES.INVALID_CREDENTIALS, 401);
    }

    // Azure AD succeeded - now check database
    const { rows } = await pool.query(
      `SELECT id, username, email, password, role, name, avatar, is_active, 
              must_change_password, password_changed_at, password_reminder_count, 
              last_password_reminder_at
       FROM tbl_appusers
       WHERE email = $1 AND is_deleted = false`,
      [azureResult.email],
    );
    const user = rows[0];

    if (!user) {
      logAuth("Azure AD authenticated but user not in database", azureResult.email, {
        ip: req.ip,
      });
      return error(res, "User not found in system. Contact administrator.", 404);
    }

    if (!user.is_active) {
      logAuth("Login blocked - inactive account", user.username, {
        userId: user.id,
        email: user.email,
        authenticated: "Azure AD",
        ip: req.ip,
      });
      return error(res, AUTH_MESSAGES.ACCOUNT_DEACTIVATED, 403);
    }

    // Continue with password expiry checks...
    // (rest of the code remains the same)
    
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
      authMethod: "Azure AD (STRICT)",
      ip: req.ip,
    });

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
      authMethod: "Azure AD",
    });
  } catch (err) {
    next(err);
  }
};
