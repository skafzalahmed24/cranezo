const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

// Cranes assigned to the signed-in operator (pass crane_id for one). POST with JSON payload.
router.post('/getAssignedCranes', authenticate, authorize(ROLES.OPERATOR), profileController.assignedCranes);

// Operator routes (placeholder structure)
router.get('/my-jobs', (req, res) => {
  return successResponse(res, 'Operator jobs endpoint ready.', []);
});

router.get('/active-task', (req, res) => {
  return successResponse(res, 'Operator active task endpoint ready.', null);
});

router.post('/shift-logs', (req, res) => {
  return successResponse(res, 'Operator shift log submission endpoint ready.', null);
});

router.get('/earnings', (req, res) => {
  return successResponse(res, 'Operator earnings endpoint ready.', { totalEarnings: 0, currency: 'INR' });
});

module.exports = router;
