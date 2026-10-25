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

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/operator', operatorRoutes);
router.use('/owner', ownerRoutes);
router.use('/customer', customerRoutes);
router.use('/dropdowns', dropdownRoutes);
router.use('/roles', roleRoutes);
router.use('/upload', uploadRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Cranzo Heavy Lifting API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
