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
const customerJobController = require('../controllers/customerJob.controller');
router.post('/booking/list', customerOnly, customerJobController.list);
router.post('/booking/get', customerOnly, customerJobController.get);
router.post('/booking/summary', customerOnly, customerJobController.summary);
router.post('/booking/active-tracking', customerOnly, customerJobController.activeTracking);
router.post('/booking/extension/request', customerOnly, customerJobController.requestExtraTime);
router.post('/booking/extension/cancel', customerOnly, customerJobController.cancelExtraTime);
router.post('/booking/pay', customerOnly, customerJobController.pay);
router.post('/booking/rate', customerOnly, customerJobController.rate);
router.post('/booking/track', customerOnly, bookingController.track);
router.post('/booking/cancel', customerOnly, bookingController.cancel);
router.post('/booking/confirm-arrival', customerOnly, require('../controllers/job.controller').customerConfirmArrival);

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
