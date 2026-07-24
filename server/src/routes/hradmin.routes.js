import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { ROLES } from "../constants/roles.js";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getJobTitles,
  createJobTitle,
  updateJobTitle,
  deleteJobTitle,
  getJobCategories,
  createJobCategory,
  updateJobCategory,
  deleteJobCategory,
  getSubUnits,
  createSubUnit,
  updateSubUnit,
  deleteSubUnit,
  getRoleAccess,
  updateUserRole,
  getAuditTrail,
  getEmployeesBySubUnit,
} from "../controllers/hradmin.controller.js";

const router = Router();

// Public endpoint - no authentication required
router.get("/sub-units/employees", getEmployeesBySubUnit);

// Protected endpoints - require authentication and HR_ADMIN or EMP_MANAGER role
router.use(authenticate);
router.use(requireRole(ROLES.HR_ADMIN, ROLES.EMP_MANAGER));

router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/users/:id/toggle-status", toggleUserStatus);

router.get("/job-titles", getJobTitles);
router.post("/job-titles", createJobTitle);
router.put("/job-titles/:id", updateJobTitle);
router.delete("/job-titles/:id", deleteJobTitle);

router.get("/job-categories", getJobCategories);
router.post("/job-categories", createJobCategory);
router.put("/job-categories/:id", updateJobCategory);
router.delete("/job-categories/:id", deleteJobCategory);

router.get("/sub-units", getSubUnits);
router.post("/sub-units", createSubUnit);
router.put("/sub-units/:id", updateSubUnit);
router.delete("/sub-units/:id", deleteSubUnit);

router.get("/role-access", getRoleAccess);
router.put("/role-access/:id", updateUserRole);

router.get("/audit-trail", getAuditTrail);

export default router;
