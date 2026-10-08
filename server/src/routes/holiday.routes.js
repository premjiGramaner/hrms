import express from "express";
import multer from "multer";
import {
  uploadHolidayPdf,
  getHolidayMatrix,
} from "../controllers/holiday.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-pdf", upload.single("file"), uploadHolidayPdf);
router.get("/matrix", getHolidayMatrix);

export default router;
