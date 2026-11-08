const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const operatorRoutes = require('./operator.routes');
const ownerRoutes = require('./owner.routes');
const customerRoutes = require('./customer.routes');
const dropdownRoutes = require('./dropdown.routes');
const roleRoutes = require('./role.routes');
const uploadRoutes = require('./upload.routes');
const profileRoutes = require('./profile.routes');
const contentRoutes = require('./content.routes');
const notificationRoutes = require('./notification.routes');
const supportRoutes = require('./support.routes');
const homeRoutes = require('./home.routes');
const placesRoutes = require('./places.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/operator', operatorRoutes);
router.use('/owner', ownerRoutes);
router.use('/customer', customerRoutes);
router.use('/dropdowns', dropdownRoutes);
router.use('/roles', roleRoutes);
router.use('/upload', uploadRoutes);
router.use('/profile', profileRoutes);
router.use('/content', contentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/support', supportRoutes);
router.use('/home', homeRoutes);
router.use('/places', placesRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Cranzo Heavy Lifting API',
    // whether phones get push notifications (Firebase key found and loaded); no secrets here
    push: require('../services/notification.service').getMessaging() ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
