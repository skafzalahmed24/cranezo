const express = require('express');
const router = express.Router();
const dropdownController = require('../controllers/dropdown.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// POST /api/dropdowns - Input body parameters { type: 2 } with Bearer token
router.post('/', authenticate, dropdownController.getStaticDropdowns);

// GET /api/dropdowns - Backwards compatible support
router.get('/', authenticate, dropdownController.getStaticDropdowns);

// Path parameter support /api/dropdowns/:type
router.post('/:type', authenticate, dropdownController.getStaticDropdowns);
router.get('/:type', authenticate, dropdownController.getStaticDropdowns);

module.exports = router;
