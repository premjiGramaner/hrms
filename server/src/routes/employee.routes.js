const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth.middleware');
const {
  listEmployees, getEmployee, getMyInfo, getSupervisors,
  createEmployee, updateEmployee, deleteEmployee,
} = require('../controllers/employee.controller');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /jpeg|jpg|png|gif|webp/.test(file.mimetype)),
});

const router = Router();
router.use(authenticate);

router.get('/my-info', getMyInfo);
router.get('/supervisors', getSupervisors);
router.get('/', listEmployees);
router.get('/:id', getEmployee);
router.post('/', upload.single('avatar'), createEmployee);
router.put('/:id', upload.single('avatar'), updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
