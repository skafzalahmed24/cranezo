const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { appUserOnly } = require('../middlewares/role.middleware');

// My Profile (mobile app users). All POST with a JSON payload.
const mine = [authenticate, appUserOnly];

router.post('/me', mine, profileController.me);
router.post('/update', mine, profileController.update);
router.post('/languages', mine, profileController.languages);
router.post('/language/save', mine, profileController.saveLanguage);
router.post('/appearance', mine, profileController.appearance);
router.post('/appearance/save', mine, profileController.saveAppearance);
router.post('/notifications', mine, profileController.notifications);
router.post('/notifications/save', mine, profileController.saveNotifications);

module.exports = router;
