const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');
const craneController = require('../controllers/crane.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

const ownerOnly = [authenticate, authorize(ROLES.CRANE_OWNER)];

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
