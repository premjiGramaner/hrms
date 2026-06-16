import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireRole } from '../middleware/auth.middleware.js';
import { leaveRequestSchema, rejectLeaveSchema } from '../validators/leave.validator.js';
import {
  getLeaveTypes,
  getLeaveBalance,
  searchEmployees,
  listLeaves,
  getLeave,
  getLeaveDetails,
  uploadLeaveAttachment,
  createLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  exportSummary,
  exportDetail,
} from '../controllers/leave.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename:    (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
      cb(null, `leave-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|pdf|doc|docx|xlsx|xls)$/i;
    if (allowed.test(file.originalname)) return cb(null, true);
    cb(new Error('File type not allowed'), false);
  },
});

const router = Router();
router.use(authenticate);

router.get('/types',             getLeaveTypes);
router.get('/balance',           getLeaveBalance);
router.get('/employees/search',  searchEmployees);

router.get('/export/summary', requireRole('empmanager', 'hradmin'), exportSummary);
router.get('/export/detail',  requireRole('empmanager', 'hradmin'), exportDetail);

router.get('/',  listLeaves);
router.post('/', validate(leaveRequestSchema), createLeave);

router.get('/:id/details', getLeaveDetails);
router.post('/:id/attachment', attachmentUpload.single('file'), uploadLeaveAttachment);
router.get('/:id', getLeave);

router.post('/:id/approve', approveLeave);
router.post('/:id/reject',  validate(rejectLeaveSchema), rejectLeave);
router.post('/:id/cancel',  cancelLeave);

export default router;
