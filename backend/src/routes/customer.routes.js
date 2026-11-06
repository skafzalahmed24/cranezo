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

// Rapido-style booking: one request to every nearby owner, first to accept wins, then pay the advance
const craneRequests = require('../controllers/craneRequest.controller');
router.post('/crane-requests/estimate', customerOnly, craneRequests.estimate);
router.post('/crane-requests/create', customerOnly, craneRequests.create);
router.post('/crane-requests/get', customerOnly, craneRequests.get);
router.post('/crane-requests/active', customerOnly, craneRequests.active);
router.post('/crane-requests', customerOnly, craneRequests.list);
router.post('/crane-requests/raise', customerOnly, craneRequests.raise);
router.post('/crane-requests/auto-raise', customerOnly, craneRequests.autoRaise);
router.post('/crane-requests/cancel', customerOnly, craneRequests.cancel);
router.post('/crane-requests/send-to-team', customerOnly, craneRequests.sendToTeam);
router.post('/crane-requests/pay-advance', customerOnly, craneRequests.payAdvance);
router.post('/crane-requests/extend-payment', customerOnly, craneRequests.extendPayment);
router.post('/payments/order', customerOnly, craneRequests.paymentOrder);
router.post('/payments/verify', customerOnly, craneRequests.paymentVerify);
router.post('/payments/failed', customerOnly, craneRequests.paymentFailed);
router.post('/payments/sync', customerOnly, craneRequests.paymentSync);

// payment history and complaints / payment disputes
const finance = require('../controllers/finance.controller');
router.post('/transactions', customerOnly, finance.customerTransactions);
router.post('/complaints/options', customerOnly, finance.complaintOptions);
router.post('/complaints/create', customerOnly, finance.customerComplaintCreate);
router.post('/complaints', customerOnly, finance.customerComplaints);
router.post('/complaints/get', customerOnly, finance.customerComplaintGet);
router.post('/complaints/reply', customerOnly, finance.customerComplaintReply);

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
