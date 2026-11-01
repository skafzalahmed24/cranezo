const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');

// Public app content (no login needed). POST { "type": "terms" | "privacy" }
router.post('/legal', profileController.legal);

module.exports = router;
