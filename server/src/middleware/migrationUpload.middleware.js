import path from "path";
import multer from "multer";
import {
  MIGRATION_LIMITS,
  XLSX_MIME_TYPE,
} from "../constants/migration.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: MIGRATION_LIMITS.MAX_FILE_SIZE },
  fileFilter: (_req, file, callback) => {
    const validExtension = path.extname(file.originalname).toLowerCase() === ".xlsx";
    const validMime = file.mimetype === XLSX_MIME_TYPE;
    if (!validExtension || !validMime) {
      const error = new Error("Only genuine .xlsx Excel files are allowed");
      error.statusCode = 400;
      return callback(error, false);
    }
    return callback(null, true);
  },
});

export function uploadMigrationFile(req, res, next) {
  upload.single("fileExcel")(req, res, (uploadError) => {
    if (!uploadError) return next();
    if (uploadError instanceof multer.MulterError) {
      uploadError.statusCode = 400;
      if (uploadError.code === "LIMIT_FILE_SIZE") {
        uploadError.message = "Excel file must not exceed 25 MB";
      }
    }
    return next(uploadError);
  });
}
