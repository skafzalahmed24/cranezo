const express = require('express');
const router = express.Router();
const appVersion = require('../controllers/appVersion.controller');

// Public (no login): the app asks this on every launch. Body: { platform: "android", current_version: "1.0.4" }
router.post('/version', appVersion.check);

module.exports = router;
