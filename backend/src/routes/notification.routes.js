const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { appUserOnly } = require('../middlewares/role.middleware');

// In-app notification feed and push registration (mobile app users). All POST with a JSON payload.
const mine = [authenticate, appUserOnly];

router.post('/list', mine, notificationController.list);
router.post('/unread-count', mine, notificationController.unreadCount);
router.post('/summary', mine, require('../controllers/support.controller').notificationSummary);
router.post('/mark-read', mine, notificationController.markRead);
router.post('/register-device', mine, notificationController.registerDevice);

module.exports = router;
