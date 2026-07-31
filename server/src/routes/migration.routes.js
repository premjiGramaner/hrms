import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import AppError from "../utils/AppError.js";
import { uploadMigrationFile } from "../middleware/migrationUpload.middleware.js";
import { downloadLeaveMigrationErrors } from "../controllers/leaveMigration.controller.js";
import {
  uploadMigration,
  startMigration,
  getMigrationStatus,
  getMigrationErrors,
  getMigrationHistory,
  downloadMigrationReport,
} from "../controllers/migration.controller.js";

const router = express.Router();

const requireMigrationAdmin = (req, _res, next) => {
  const isBuiltInAdmin = req.user?.id === 0 || req.user?.username === "admin";
  if (isBuiltInAdmin || req.user?.role === ROLES.HR_ADMIN) return next();
  return next(new AppError("Forbidden", 403));
};

router.use(authenticate, requireMigrationAdmin);

router.post("/upload", uploadMigrationFile, uploadMigration);
router.get("/history", getMigrationHistory);
router.get("/:id/status", getMigrationStatus);
router.get("/:id/errors", getMigrationErrors);
router.get("/:id/leave-report", downloadLeaveMigrationErrors);
router.post("/:id/start", startMigration);
router.get("/:id/report", downloadMigrationReport);

export default router;
