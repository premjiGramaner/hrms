import { Router } from "express";
import {
  login,
  self,
  logout,
  resetExpiredPassword,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { loginSchema } from "../validators/auth.validator.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.get("/profile", authenticate, self);
router.post("/logout", logout);
router.post("/reset-expired-password", resetExpiredPassword);
router.get("/verify-cookie", authenticate, (req, res) => {
  res.json({ success: true, data: { authenticated: true, user: req.user } });
});

export default router;
