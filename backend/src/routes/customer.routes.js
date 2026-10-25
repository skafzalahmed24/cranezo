const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');

// Customer routes (placeholder structure)
router.get('/cranes', (req, res) => {
  return successResponse(res, 'Customer browse cranes endpoint ready.', []);
});

router.post('/bookings', (req, res) => {
  return successResponse(res, 'Customer create booking endpoint ready.', null);
});

router.get('/my-bookings', (req, res) => {
  return successResponse(res, 'Customer my bookings endpoint ready.', []);
});

router.get('/bookings/:id/track', (req, res) => {
  return successResponse(res, 'Customer live tracking endpoint ready.', null);
});

module.exports = router;
