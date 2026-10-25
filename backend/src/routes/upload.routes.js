const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { uploadAny } = require('../middlewares/upload.middleware');

// POST /api/upload - Accepts type 1 (single) or type 2 (multiple)
router.post('/', uploadAny, uploadController.uploadFile);

// Explicit aliases
router.post('/single', uploadAny, (req, res, next) => {
  req.body.type = 1;
  next();
}, uploadController.uploadFile);

router.post('/multiple', uploadAny, (req, res, next) => {
  req.body.type = 2;
  next();
}, uploadController.uploadFile);

module.exports = router;
