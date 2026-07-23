import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logInfo, logError } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROFILE_UPLOAD_DIR = path.join(__dirname, "../../uploads/profile");

/**
 * Safely delete an existing profile image from the server
 * @param {string} avatarPath - The avatar path from database (e.g., /uploads/profile/profile-123.jpg)
 * @returns {Promise<boolean>} - Returns true if deleted or file didn't exist, false if error occurred
 */
export async function deleteExistingProfileImage(avatarPath) {
  if (!avatarPath) {
    return true;
  }

  try {
    // Extract filename from path to prevent directory traversal attacks
    const filename = path.basename(avatarPath);

    // Validate that filename doesn't contain path separators
    if (filename.includes("/") || filename.includes("\\")) {
      logError("Invalid avatar path detected", new Error("Path traversal attempt"), {
        avatarPath,
        filename,
      });
      return false;
    }

    // Construct the full file path
    const fullPath = path.join(PROFILE_UPLOAD_DIR, filename);

    // Verify the resolved path is within the profile upload directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadDir = path.resolve(PROFILE_UPLOAD_DIR);

    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      logError("Path traversal attempt blocked", new Error("File outside upload directory"), {
        avatarPath,
        resolvedPath,
        uploadDir: resolvedUploadDir,
      });
      return false;
    }

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      // File doesn't exist, which is fine
      logInfo("Profile image file not found (already deleted or never existed)", {
        avatarPath,
        fullPath,
      });
      return true;
    }

    // Delete the file
    await fs.unlink(fullPath);
    logInfo("Old profile image deleted successfully", {
      avatarPath,
      fullPath,
    });
    return true;
  } catch (err) {
    logError("Failed to delete old profile image", err, { avatarPath });
    return false;
  }
}

/**
 * Get the profile upload directory path
 * @returns {string} - The absolute path to the profile upload directory
 */
export function getProfileUploadDir() {
  return PROFILE_UPLOAD_DIR;
}
