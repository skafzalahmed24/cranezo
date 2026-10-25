const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Protected admin dashboard routes
router.get('/dashboard-stats', authenticate, adminController.getDashboardStats);

module.exports = router;
