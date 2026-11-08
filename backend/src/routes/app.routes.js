const express = require('express');
const router = express.Router();
const { check } = require('../services/appVersion.service');
const { successResponse } = require('../utils/apiResponse');

// Public (no login): the app asks this when it starts. Body: { version_code: 12 }
router.post('/version', (req, res) => successResponse(res, 'App version checked.', check((req.body || {}).version_code)));

module.exports = router;
