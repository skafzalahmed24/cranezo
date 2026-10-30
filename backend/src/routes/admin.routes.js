const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const craneController = require('../controllers/crane.controller');
const settingsController = require('../controllers/settings.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');

const adminOnly = [authenticate, requireAdmin];

// Protected admin dashboard routes
router.get('/dashboard-stats', authenticate, adminController.getDashboardStats);

// Crane approvals
router.post('/cranes/summary', adminOnly, craneController.adminSummary);
router.post('/cranes/list', adminOnly, craneController.adminList);
router.post('/cranes/get', adminOnly, craneController.adminGet);
router.put('/cranes/:id/approve', adminOnly, craneController.adminApprove);
router.put('/cranes/:id/reject', adminOnly, craneController.adminReject);

// Settings: dropdown values (add + edit only, no delete)
router.post('/settings/dropdown-types', adminOnly, settingsController.listTypes);
router.post('/settings/dropdowns/list', adminOnly, settingsController.listDropdowns);
router.post('/settings/dropdowns', adminOnly, settingsController.createDropdown);
router.put('/settings/dropdowns/:id', adminOnly, settingsController.updateDropdown);

module.exports = router;
