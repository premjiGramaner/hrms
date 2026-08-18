import { ConfidentialClientApplication } from "@azure/msal-node";
import axios from "axios";
import {
  AZURE_AD_CONFIG,
  MSAL_CONFIG,
  SCOPES,
} from "../config/azureAd.config.js";
import { logInfo, logError } from "../utils/logger.js";

const msalClient = new ConfidentialClientApplication(MSAL_CONFIG);

/**
 * Get the authorization URL for Microsoft login
 */
function getMicrosoftAuthUrl(state) {
  const authCodeUrlParameters = {
    scopes: SCOPES,
    redirectUri: AZURE_AD_CONFIG.redirectUri,
    state: state || "",
  };

  return msalClient.getAuthCodeUrl(authCodeUrlParameters);
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(authorizationCode) {
  const tokenRequest = {
    code: authorizationCode,
    scopes: SCOPES,
    redirectUri: AZURE_AD_CONFIG.redirectUri,
  };

  try {
    const tokenResponse = await msalClient.acquireTokenByCode(tokenRequest);
    logInfo("Successfully acquired token from Microsoft", {
      account: tokenResponse.account?.username,
    });
    return tokenResponse;
  } catch (error) {
    logError("Failed to acquire token from Microsoft", error);
    throw new Error("Failed to exchange authorization code for token");
  }
}

/**
 * Get user profile from Microsoft Graph API
 */
async function getMicrosoftUserProfile(accessToken) {
  try {
    const response = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userProfile = response.data;
    logInfo("Retrieved Microsoft user profile", {
      email: userProfile.mail || userProfile.userPrincipalName,
    });

    return {
      email: (userProfile.mail || userProfile.userPrincipalName || "").toLowerCase(),
      name: userProfile.displayName || "",
      firstName: userProfile.givenName || "",
      lastName: userProfile.surname || "",
      microsoftId: userProfile.id || "",
    };
  } catch (error) {
    logError("Failed to fetch Microsoft user profile", error);
    throw new Error("Failed to fetch user profile from Microsoft");
  }
}

/**
 * Validate if email domain is allowed
 */
function isEmailDomainAllowed(email) {
  if (!email) return false;

  const emailDomain = email.split("@")[1]?.toLowerCase();
  const allowedDomain = AZURE_AD_CONFIG.allowedDomain.toLowerCase();

  return emailDomain === allowedDomain;
}

/**
 * Complete Microsoft OAuth flow
 */
async function completeMicrosoftAuth(authorizationCode) {
  const tokenResponse = await exchangeCodeForToken(authorizationCode);

  if (!tokenResponse || !tokenResponse.accessToken) {
    throw new Error("No access token received from Microsoft");
  }

  const userProfile = await getMicrosoftUserProfile(tokenResponse.accessToken);

  if (!isEmailDomainAllowed(userProfile.email)) {
    logError("Unauthorized domain in Microsoft login attempt", null, {
      email: userProfile.email,
      allowedDomain: AZURE_AD_CONFIG.allowedDomain,
    });
    throw new Error(
      `Only ${AZURE_AD_CONFIG.allowedDomain} email addresses are allowed`,
    );
  }

  return {
    email: userProfile.email,
    name: userProfile.name,
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    microsoftId: userProfile.microsoftId,
  };
}

export { getMicrosoftAuthUrl, completeMicrosoftAuth, isEmailDomainAllowed };
