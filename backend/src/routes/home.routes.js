const express = require('express');
const router = express.Router();
const homeController = require('../controllers/home.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize, appUserOnly } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

// Home screen data. All POST with a JSON payload.
router.post('/banners', authenticate, appUserOnly, homeController.banners);
router.post('/customer', authenticate, authorize(ROLES.CUSTOMER), homeController.customerHome);

module.exports = router;
