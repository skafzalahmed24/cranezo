const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');

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
