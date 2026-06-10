const { Router } = require('express');
const { login, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);

module.exports = router;
