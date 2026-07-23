import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../uploads/profile");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp)$/;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_SIZE_MB = MAX_SIZE / (1024 * 1024);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    callback(null, `profile-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, callback) => {
  if (ALLOWED_MIME.test(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new Error("Only JPG, JPEG, PNG, and WEBP image files are allowed"),
      false,
    );
  }
};

const upload = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter });

export const uploadSingle = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      err.message = `Profile image should be below ${MAX_SIZE_MB}MB`;
    }
    err.statusCode = err.statusCode || 400;
    next(err);
  });
};

export default upload;
