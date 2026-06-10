import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getUsers,
  deactivateUser,
  getJobTitles,
  getJobCategories,
  getAuditTrail,
} from '../controllers/hradmin.controller.js';

const router = Router();
router.use(authenticate);

router.get('/users', getUsers);
router.post('/users/:id/deactivate', deactivateUser);
router.get('/job-titles', getJobTitles);
router.get('/job-categories', getJobCategories);
router.get('/audit-trail', getAuditTrail);

export default router;
