import { PublicClientApplication } from "@azure/msal-node";
import axios from "axios";
import { AZURE_AD_CONFIG, SCOPES } from "../config/azureAd.config.js";
import { logInfo, logError } from "../utils/logger.js";

/**
 * MSAL configuration for username/password authentication
 * Uses Resource Owner Password Credentials (ROPC) flow
 */
const publicClientConfig = {
  auth: {
    clientId: AZURE_AD_CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${AZURE_AD_CONFIG.tenantId}`,
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

const publicClient = new PublicClientApplication(publicClientConfig);

/**
 * Authenticate user with username and password against Azure AD
 * @param {string} username - User's username or email
 * @param {string} password - User's password
 * @returns {Promise<Object>} User profile information
 */
async function authenticateWithPassword(username, password) {
  try {
    // Ensure username is in email format
    const userEmail = username.includes("@")
      ? username
      : `${username}@${AZURE_AD_CONFIG.allowedDomain}`;

    logInfo("Attempting Azure AD password authentication", {
      username: userEmail,
    });

    // Request token using username and password (ROPC flow)
    const tokenRequest = {
      scopes: SCOPES,
      username: userEmail,
      password: password,
    };

    const tokenResponse = await publicClient.acquireTokenByUsernamePassword(
      tokenRequest,
    );

    if (!tokenResponse || !tokenResponse.accessToken) {
      throw new Error("No access token received from Azure AD");
    }

    logInfo("Successfully authenticated against Azure AD", {
      username: userEmail,
      account: tokenResponse.account?.username,
    });

    // Fetch user profile from Microsoft Graph
    const userProfile = await getUserProfileFromGraph(
      tokenResponse.accessToken,
    );

    return {
      success: true,
      email: userProfile.email,
      name: userProfile.name,
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      microsoftId: userProfile.microsoftId,
      authenticated: true,
    };
  } catch (error) {
    logError("Azure AD password authentication failed", error, {
      username,
      errorCode: error.errorCode,
      errorMessage: error.errorMessage,
    });

    // Return failure but don't throw - allow fallback to local auth
    return {
      success: false,
      error: error.errorMessage || error.message,
      authenticated: false,
    };
  }
}

/**
 * Fetch user profile from Microsoft Graph API
 * @param {string} accessToken - Access token from Azure AD
 * @returns {Promise<Object>} User profile data
 */
async function getUserProfileFromGraph(accessToken) {
  try {
    const response = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = response.data;

    return {
      email: (userData.mail || userData.userPrincipalName || "").toLowerCase(),
      name: userData.displayName || "",
      firstName: userData.givenName || "",
      lastName: userData.surname || "",
      microsoftId: userData.id || "",
    };
  } catch (error) {
    logError("Failed to fetch user profile from Microsoft Graph", error);
    throw new Error("Failed to fetch user profile from Microsoft");
  }
}

/**
 * Validate if username exists in Azure AD (without password check)
 * @param {string} username - User's username or email
 * @returns {Promise<Object>} Validation result
 */
async function validateUsernameInAzureAd(username) {
  try {
    // Ensure username is in email format
    const userEmail = username.includes("@")
      ? username
      : `${username}@${AZURE_AD_CONFIG.allowedDomain}`;

    logInfo("Validating username in Azure AD", {
      username: userEmail,
    });

    // Try to get user info from Microsoft Graph
    // We need a token to query Graph API, so we'll use app-only authentication
    const tokenResponse = await getAppOnlyToken();
    
    if (!tokenResponse || !tokenResponse.accessToken) {
      logError("Failed to get app-only token for user validation");
      return {
        success: false,
        error: "Failed to validate username",
        exists: false,
      };
    }

    // Search for user in Azure AD
    try {
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.accessToken}`,
          },
        }
      );

      const userData = response.data;

      logInfo("User found in Azure AD", {
        username: userEmail,
        displayName: userData.displayName,
      });

      return {
        success: true,
        exists: true,
        email: (userData.mail || userData.userPrincipalName || "").toLowerCase(),
        name: userData.displayName || "",
      };
    } catch (graphError) {
      if (graphError.response?.status === 404) {
        logInfo("User not found in Azure AD", { username: userEmail });
        return {
          success: false,
          exists: false,
          error: "User not found in Azure AD",
        };
      }
      throw graphError;
    }
  } catch (error) {
    logError("Azure AD username validation failed", error, {
      username,
    });

    return {
      success: false,
      exists: false,
      error: error.message,
    };
  }
}

/**
 * Get app-only access token for Microsoft Graph API
 * @returns {Promise<Object>} Token response
 */
async function getAppOnlyToken() {
  try {
    const confidentialClient = new (await import("@azure/msal-node")).ConfidentialClientApplication({
      auth: {
        clientId: AZURE_AD_CONFIG.clientId,
        authority: `https://login.microsoftonline.com/${AZURE_AD_CONFIG.tenantId}`,
        clientSecret: AZURE_AD_CONFIG.clientSecret,
      },
    });

    const tokenResponse = await confidentialClient.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    return tokenResponse;
  } catch (error) {
    logError("Failed to acquire app-only token", error);
    return null;
  }
}

/**
 * Check if Azure AD authentication is configured and enabled
 * @returns {boolean} True if configured and enabled
 */
function isAzureAdConfigured() {
  return Boolean(
    AZURE_AD_CONFIG.clientId &&
      AZURE_AD_CONFIG.tenantId &&
      AZURE_AD_CONFIG.allowedDomain &&
      AZURE_AD_CONFIG.passwordAuthEnabled,
  );
}

export { authenticateWithPassword, validateUsernameInAzureAd, isAzureAdConfigured };
