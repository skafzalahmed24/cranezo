const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');
const craneController = require('../controllers/crane.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

const ownerOnly = [authenticate, authorize(ROLES.CRANE_OWNER)];
const bookingController = require('../controllers/booking.controller');

// Incoming crane requests (the buzzer opens these). All POST with a JSON payload.
router.post('/requests/list', ownerOnly, bookingController.ownerList);
router.post('/requests/summary', ownerOnly, bookingController.ownerSummary);
router.post('/requests/get', ownerOnly, bookingController.ownerGet);
router.post('/requests/accept', ownerOnly, bookingController.ownerAccept);
router.post('/requests/decline', ownerOnly, bookingController.ownerDecline);
router.post('/requests/assign-operator', ownerOnly, require('../controllers/job.controller').ownerAssignOperator);

// Owner Jobs tabs, job details, live location, evidence and Earnings. All POST with a JSON payload.
const ownerJobController = require('../controllers/ownerJob.controller');
router.post('/home', ownerOnly, ownerJobController.home);
router.post('/jobs/summary', ownerOnly, ownerJobController.summary);
router.post('/jobs/list', ownerOnly, ownerJobController.list);
router.post('/jobs/get', ownerOnly, ownerJobController.get);
router.post('/jobs/track', ownerOnly, ownerJobController.track);
router.post('/jobs/evidence', ownerOnly, ownerJobController.evidence);
router.post('/earnings/summary', ownerOnly, ownerJobController.earningsSummary);
router.post('/earnings/trend', ownerOnly, ownerJobController.earningsTrend);
router.post('/earnings/jobs', ownerOnly, ownerJobController.earningsJobs);

// Rapido-style requests from customers near the owner's cranes
const craneRequests = require('../controllers/craneRequest.controller');
router.post('/crane-requests', ownerOnly, craneRequests.ownerList);
router.post('/crane-requests/accept', ownerOnly, craneRequests.ownerAccept);

// payments, GST and charges, operator commission, settlements, job requests, complaints
const finance = require('../controllers/finance.controller');
router.post('/billing/settings', ownerOnly, finance.ownerBillingGet);
router.post('/billing/settings/save', ownerOnly, finance.ownerBillingSave);
router.post('/jobs/commission', ownerOnly, finance.ownerSetCommission);
router.post('/transactions', ownerOnly, finance.ownerTransactions);
router.post('/settlements/platform', ownerOnly, finance.ownerPlatformPending);

// Subscription: free trial, monthly and yearly plans paid with Razorpay
const subscription = require('../controllers/subscription.controller');
router.post('/subscription', ownerOnly, subscription.status);
router.post('/subscription/start-trial', ownerOnly, subscription.startTrial);
router.post('/subscription/order', ownerOnly, subscription.order);
router.post('/subscription/verify', ownerOnly, subscription.verify);
router.post('/subscription/sync', ownerOnly, subscription.sync);
router.post('/settlements', ownerOnly, finance.ownerSettlements);
router.post('/settlements/get', ownerOnly, finance.ownerSettlementGet);
router.post('/operator-payments', ownerOnly, finance.ownerOperatorDues);
router.post('/operator-payments/jobs', ownerOnly, finance.ownerOperatorPending);
router.post('/operator-payments/pay', ownerOnly, finance.ownerPayOperator);
router.post('/job-requests', ownerOnly, finance.ownerJobRequests);
router.post('/job-requests/respond', ownerOnly, finance.ownerJobRequestRespond);
router.post('/complaints', ownerOnly, finance.ownerComplaints);
router.post('/complaints/summary', ownerOnly, finance.ownerComplaintSummary);
router.post('/complaints/get', ownerOnly, finance.ownerComplaintGet);
router.post('/complaints/update', ownerOnly, finance.ownerComplaintUpdate);

// Crane management (Crane Owner)
router.post('/cranes/form-options', ownerOnly, craneController.getFormOptions);
router.post('/operators', ownerOnly, craneController.listOperators);
router.post('/operators/add', ownerOnly, craneController.addOperator);
router.post('/cranes', ownerOnly, craneController.createCrane);
// One read API: pass crane_id for details, omit it for the full list (owner_id optional)
router.post('/getCranes', ownerOnly, craneController.getCranes);
router.put('/cranes/:id', ownerOnly, craneController.updateMyCrane);
router.put('/cranes/:id/documents', ownerOnly, craneController.saveMyCraneDocuments);

// Owner routes (placeholder structure)
router.get('/fleet', (req, res) => {
  return successResponse(res, 'Owner fleet endpoint ready.', []);
});

router.get('/telematics', (req, res) => {
  return successResponse(res, 'Owner telematics endpoint ready.', []);
});

router.get('/revenue', (req, res) => {
  return successResponse(res, 'Owner revenue endpoint ready.', { totalRevenue: 0, currency: 'INR' });
});

module.exports = router;
