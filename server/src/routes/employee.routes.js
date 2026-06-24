import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import upload from "../services/upload.service.js";
import { employeeSchema } from "../validators/employee.validator.js";
import {
  listEmployees,
  getEmployee,
  getMyInfo,
  getSupervisors,
  createEmployee,
  updateEmployee,
  updateProfileImage,
  deleteEmployee,
  checkEmailExists,
  terminateEmployee,
} from "../controllers/employee.controller.js";

const router = Router();
router.use(authenticate);

router.get("/my-info", getMyInfo);
router.get("/supervisors", getSupervisors);
router.post("/check-email", checkEmailExists);
router.get("/", listEmployees);
router.get("/:id", getEmployee);
router.post(
  "/",
  upload.single("avatar"),
  validate(employeeSchema),
  createEmployee,
);
router.put(
  "/:id",
  upload.single("avatar"),
  validate(employeeSchema),
  updateEmployee,
);
router.patch(
  "/:id/profile-image",
  upload.single("avatar"),
  updateProfileImage,
);
router.delete("/:id", deleteEmployee);
router.post("/:id/terminate", terminateEmployee);

export default router;
