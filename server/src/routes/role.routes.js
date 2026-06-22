import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import {
  listRoles,
  createRole,
  deleteRole,
} from "../controllers/role.controller.js";
import { roleSchema } from "../validators/role.validator.js";

const router = Router();
router.use(authenticate);

router.get("/", listRoles);
router.post("/", validate(roleSchema), createRole);
router.delete("/:id", deleteRole);

export default router;
