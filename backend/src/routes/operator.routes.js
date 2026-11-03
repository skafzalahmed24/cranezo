const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

const jobController = require('../controllers/job.controller');
const operatorOnly = [authenticate, authorize(ROLES.OPERATOR)];

// Operator app: Home, Jobs, job steps and Earnings. All POST with a JSON payload.
router.post('/home', operatorOnly, jobController.home);
router.post('/status', operatorOnly, jobController.setOnline);
router.post('/location', operatorOnly, jobController.updateLocation);

router.post('/jobs/list', operatorOnly, jobController.list);
router.post('/jobs/get', operatorOnly, jobController.get);
router.post('/jobs/accept', operatorOnly, jobController.accept);
router.post('/jobs/decline', operatorOnly, jobController.decline);
router.post('/jobs/start-journey', operatorOnly, jobController.startJourney);
router.post('/jobs/arrived', operatorOnly, jobController.arrived);
router.post('/jobs/confirm-arrival', operatorOnly, jobController.confirmArrival);
router.post('/jobs/site-photos', operatorOnly, jobController.sitePhotos);
router.post('/jobs/checklist', operatorOnly, jobController.checklist);
router.post('/jobs/checklist/save', operatorOnly, jobController.saveChecklist);
router.post('/jobs/start', operatorOnly, jobController.start);
router.post('/jobs/waiting', operatorOnly, jobController.waiting);
router.post('/jobs/breakdown', operatorOnly, jobController.breakdown);
router.post('/jobs/issue', operatorOnly, jobController.issue);
router.post('/jobs/emergency', operatorOnly, jobController.emergency);
router.post('/jobs/extension/respond', operatorOnly, jobController.extensionRespond);
router.post('/jobs/finish', operatorOnly, jobController.finish);
router.post('/jobs/request-confirmation', operatorOnly, jobController.requestConfirmation);
router.post('/jobs/confirm-completion', operatorOnly, jobController.confirmCompletion);

router.post('/earnings/summary', operatorOnly, jobController.earningsSummary);
router.post('/earnings/list', operatorOnly, jobController.earningsList);

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
