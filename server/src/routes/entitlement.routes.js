import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import {
  getEmployees,
  getLeaveTypes,
  createEntitlements,
  listEntitlements,
  myEntitlements,
} from "../controllers/entitlement.controller.js";

const router = Router();
router.use(authenticate);

router.get("/employees", getEmployees);
router.get("/leave-types", getLeaveTypes);

router.get("/my", myEntitlements);

router.get("/", listEntitlements);

router.post(
  "/",
  requireRole(ROLES.EMP_MANAGER, ROLES.HR_ADMIN),
  createEntitlements,
);

export default router;
