import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { logError, logInfo } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads", "profile");
const UPLOADS_URL_PREFIX = "/uploads/profile";

async function ensureUploadsDirectory() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    logInfo("Profile uploads directory ensured", { path: UPLOADS_DIR });
  } catch (err) {
    logError("Failed to create uploads directory", err, { path: UPLOADS_DIR });
    throw err;
  }
}

function generateUniqueFilename(originalFilename) {
  const ext = path.extname(originalFilename);
  const randomString = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  return `${timestamp}-${randomString}${ext}`;
}

async function saveProfileImage(fileBuffer, originalFilename) {
  try {
    await ensureUploadsDirectory();

    const filename = generateUniqueFilename(originalFilename);
    const filepath = path.join(UPLOADS_DIR, filename);

    await fs.writeFile(filepath, fileBuffer);
    logInfo("Profile image saved", { filename, path: filepath });

    return `${UPLOADS_URL_PREFIX}/${filename}`;
  } catch (err) {
    logError("Failed to save profile image", err, { originalFilename });
    throw err;
  }
}

async function deleteProfileImage(imagePath) {
  if (!imagePath) return;

  try {
    if (!imagePath.startsWith(UPLOADS_URL_PREFIX)) {
      logInfo("Skipping deletion of non-filesystem image", { imagePath });
      return;
    }

    const filename = path.basename(imagePath);
    const filepath = path.join(UPLOADS_DIR, filename);

    await fs.unlink(filepath);
    logInfo("Profile image deleted", { filename, path: filepath });
  } catch (err) {
    if (err.code === "ENOENT") {
      logInfo("Profile image file not found (already deleted)", { imagePath });
    } else {
      logError("Failed to delete profile image", err, { imagePath });
    }
  }
}

export { saveProfileImage, deleteProfileImage, ensureUploadsDirectory };