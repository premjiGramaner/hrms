const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { getUsers, deactivateUser, getJobTitles, getJobCategories, getAuditTrail } = require('../controllers/hradmin.controller');

const router = Router();
router.use(authenticate);

router.get('/users', getUsers);
router.post('/users/:id/deactivate', deactivateUser);
router.get('/job-titles', getJobTitles);
router.get('/job-categories', getJobCategories);
router.get('/audit-trail', getAuditTrail);

module.exports = router;
