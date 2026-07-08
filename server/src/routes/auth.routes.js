import { Router } from "express";
import {
  createFirstTimePassword,
  forgotPassword,
  login,
  logout,
  resetPassword,
  self,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/create-first-time-password", createFirstTimePassword);
router.post("/logout", logout);
router.get("/profile", authenticate, self);

export default router;
