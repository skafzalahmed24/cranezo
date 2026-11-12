const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Mobile User Onboarding Flow
router.post('/registerOrLogin', authController.registerOrLogin);
router.post('/verifyOtp', authController.verifyOtp);
router.post('/updateProfile', authController.updateProfile);

// Admin & General Authentication
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refreshToken', authController.refreshToken);

// Protected routes
router.post('/logout', authenticate, profileController.logout);
router.post('/roles', authenticate, authController.roles);
router.post('/switchRole', authenticate, authController.switchRole);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
