import express from "express";
import multer from "multer";
import {
  uploadHolidayPdf,
  getHolidayMatrix,
} from "../controllers/holiday.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

// All holiday routes require a valid session
router.use(authenticate);

// 5 MB hard cap — large enough for any real holiday PDF, blocks memory exhaustion
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new Error("Only PDF files are accepted"));
  },
});

// Upload — admin only
router.post(
  "/upload-pdf",
  requireRole(ROLES.HR_ADMIN, ROLES.EMP_MANAGER),
  upload.single("file"),
  uploadHolidayPdf,
);

// Matrix read — any authenticated user
router.get("/matrix", getHolidayMatrix);

export default router;
