const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

const jobController = require('../controllers/job.controller');
const operatorOnly = [authenticate, authorize(ROLES.OPERATOR)];
// job actions need an operator the admin has verified (documents approved)
const { requireVerifiedOperator } = require('../middlewares/verifiedOperator.middleware');
const verifiedOperator = [...operatorOnly, requireVerifiedOperator];

// Operator app: Home, Jobs, job steps and Earnings. All POST with a JSON payload.
router.post('/home', operatorOnly, jobController.home);
router.post('/ratings', operatorOnly, require('../controllers/myRatings.controller').list);
router.post('/status', verifiedOperator, jobController.setOnline);
router.post('/location', operatorOnly, jobController.updateLocation);

router.post('/jobs/list', operatorOnly, jobController.list);
router.post('/jobs/get', operatorOnly, jobController.get);
router.post('/jobs/accept', verifiedOperator, jobController.accept);
router.post('/jobs/decline', operatorOnly, jobController.decline);
router.post('/jobs/start-journey', verifiedOperator, jobController.startJourney);
router.post('/jobs/arrived', verifiedOperator, jobController.arrived);
router.post('/jobs/confirm-arrival', verifiedOperator, jobController.confirmArrival);
router.post('/jobs/site-photos', verifiedOperator, jobController.sitePhotos);
router.post('/jobs/checklist', operatorOnly, jobController.checklist);
router.post('/jobs/checklist/save', verifiedOperator, jobController.saveChecklist);
router.post('/jobs/start', verifiedOperator, jobController.start);
router.post('/jobs/waiting', verifiedOperator, jobController.waiting);
router.post('/jobs/breakdown', operatorOnly, jobController.breakdown);
router.post('/jobs/issue', operatorOnly, jobController.issue);
router.post('/jobs/emergency', operatorOnly, jobController.emergency);
router.post('/jobs/extension/respond', verifiedOperator, jobController.extensionRespond);
router.post('/jobs/finish', verifiedOperator, jobController.finish);
router.post('/jobs/request-confirmation', verifiedOperator, jobController.requestConfirmation);
router.post('/jobs/confirm-completion', verifiedOperator, jobController.confirmCompletion);

router.post('/earnings/summary', operatorOnly, jobController.earningsSummary);
router.post('/earnings/list', operatorOnly, jobController.earningsList);

// open jobs from owners, and commission payments received
const finance = require('../controllers/finance.controller');
router.post('/available-jobs', operatorOnly, finance.operatorAvailableJobs);
router.post('/available-jobs/request', verifiedOperator, finance.operatorRequestJob);
router.post('/job-requests', operatorOnly, finance.operatorMyRequests);
router.post('/job-requests/withdraw', operatorOnly, finance.operatorWithdrawRequest);
router.post('/settlements', operatorOnly, finance.operatorSettlements);
router.post('/settlements/get', operatorOnly, finance.operatorSettlementGet);

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
