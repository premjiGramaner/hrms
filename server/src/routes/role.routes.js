const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { listRoles, createRole, deleteRole } = require('../controllers/role.controller');

const router = Router();
router.use(authenticate);

router.get('/', listRoles);
router.post('/', createRole);
router.delete('/:id', deleteRole);

module.exports = router;
