import { clientBaseUrl } from "../config/env.js";

/**
 * Resolves the client-facing base URL from config or the incoming request.
 * Falls back to replacing the server port with the dev client port.
 */
export function getClientUrl(req) {
  if (clientBaseUrl) return clientBaseUrl.replace(/\/$/, "");
  const host = req.get("origin") || `${req.protocol}://${req.get("host")}`;
  return host
    .replace(/\/$/, "")
    .replace(/:5000$/, ":5173")
    .replace(/:5001$/, ":5173");
}
