import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import upload from '../services/upload.service.js';
import { employeeSchema } from '../validators/employee.validator.js';
import {
  listEmployees, getEmployee, getMyInfo, getSupervisors,
  createEmployee, updateEmployee, deleteEmployee,
} from '../controllers/employee.controller.js';

const router = Router();
router.use(authenticate);

router.get('/my-info', getMyInfo);
router.get('/supervisors', getSupervisors);
router.get('/', listEmployees);
router.get('/:id', getEmployee);
router.post('/', upload.single('avatar'), validate(employeeSchema), createEmployee);
router.put('/:id', upload.single('avatar'), validate(employeeSchema), updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;
