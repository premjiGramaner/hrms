import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  resetPassword,
  verifyToken,
  self,
  microsoftLogin,
  microsoftCallback,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-token", verifyToken);
router.post("/logout", logout);
router.get("/profile", authenticate, self);

// Microsoft Azure AD authentication routes
router.get("/microsoft", microsoftLogin);
router.get("/microsoft/callback", microsoftCallback);

export default router;
