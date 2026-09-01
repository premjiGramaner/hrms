import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import { uploadSingle } from "../services/upload.service.js";
import { employeeSchema } from "../validators/employee.validator.js";
import {
  listEmployees,
  searchAllEmployees,
  listSuperiorUsers,
  getEmployee,
  getMyInfo,
  getSupervisors,
  getSupervisorsByIds,
  getLocations,
  createEmployee,
  updateEmployee,
  updateProfileImage,
  deleteEmployee,
  checkEmailExists,
  checkEmployeeIdExists,
  getLastEmployeeId,
  terminateEmployee,
} from "../controllers/employee.controller.js";

const router = Router();
router.use(authenticate);

router.get("/my-info", getMyInfo);
router.get("/supervisors", getSupervisors);
router.post("/supervisors-by-ids", getSupervisorsByIds);
router.get("/locations", getLocations);

// Chatbot: search all employees including terminated
router.get("/chatbot-search", searchAllEmployees);
router.get("/last-employee-id", getLastEmployeeId);
router.post("/check-email", checkEmailExists);
router.post("/check-employee-id", checkEmployeeIdExists);
router.get("/superiors", listSuperiorUsers);
router.get("/", listEmployees);
router.get("/:id", getEmployee);
router.post(
  "/",
  uploadSingle("avatar"),
  validate(employeeSchema),
  createEmployee,
);
router.put(
  "/:id",
  uploadSingle("avatar"),
  validate(employeeSchema),
  updateEmployee,
);
router.patch("/:id/profile-image", uploadSingle("avatar"), updateProfileImage);
router.delete("/:id", deleteEmployee);
router.post("/:id/terminate", terminateEmployee);

export default router;
