import { Router } from "express";
import {
  createPassword,
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
router.post("/create-password", createPassword);
router.post("/create-first-time-password", createFirstTimePassword);
router.get("/profile", authenticate, self);
router.post("/logout", logout);
router.get("/verify-cookie", authenticate, (req, res) => {
  res.json({ success: true, data: { authenticated: true, user: req.user } });
});

export default router;
