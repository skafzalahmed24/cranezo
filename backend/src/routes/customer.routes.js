const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');
const bookingController = require('../controllers/booking.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

// Book a Crane (customer). All POST with a JSON payload.
const customerOnly = [authenticate, authorize(ROLES.CUSTOMER)];
router.post('/booking/options', customerOnly, bookingController.options);
router.post('/booking/search', customerOnly, bookingController.search);
router.post('/booking/crane-details', customerOnly, bookingController.craneDetails);
router.post('/booking/create', customerOnly, bookingController.create);
router.post('/booking/list', customerOnly, bookingController.customerList);
router.post('/booking/get', customerOnly, bookingController.customerGet);
router.post('/booking/track', customerOnly, bookingController.track);
router.post('/booking/cancel', customerOnly, bookingController.cancel);

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
