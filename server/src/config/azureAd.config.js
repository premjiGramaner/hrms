import dotenv from "dotenv";

dotenv.config();

const AZURE_AD_CONFIG = {
  clientId: process.env.AZURE_AD_CLIENT_ID || "",
  tenantId: process.env.AZURE_AD_TENANT_ID || "",
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
  redirectUri: process.env.AZURE_AD_REDIRECT_URI || "http://localhost:5001/api/auth/microsoft/callback",
  allowedDomain: process.env.AZURE_AD_ALLOWED_DOMAIN || "cannyfore.com",
  passwordAuthEnabled: process.env.AZURE_AD_PASSWORD_AUTH_ENABLED !== "false", // Default: true
};

const MSAL_CONFIG = {
  auth: {
    clientId: AZURE_AD_CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${AZURE_AD_CONFIG.tenantId}`,
    clientSecret: AZURE_AD_CONFIG.clientSecret,
  },
  system: {
    loggerOptions: {
      loggerCallback(logLevel, message) {
        if (process.env.NODE_ENV === "development") {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === "development" ? 3 : 1,
    },
  },
};

const SCOPES = ["user.read", "openid", "profile", "email"];

export { AZURE_AD_CONFIG, MSAL_CONFIG, SCOPES };
