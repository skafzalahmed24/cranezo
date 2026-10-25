const express = require('express');
const router = express.Router();
const dropdownController = require('../controllers/dropdown.controller');

// GET /api/roles
router.get('/', dropdownController.getRoles);

module.exports = router;
