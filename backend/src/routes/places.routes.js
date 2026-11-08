const express = require('express');
const router = express.Router();
const places = require('../controllers/places.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { appUserOnly } = require('../middlewares/role.middleware');

// Address search and "address of this map point" for the booking location step (mobile app users)
const mine = [authenticate, appUserOnly];

router.post('/search', mine, places.search);
router.post('/reverse', mine, places.reverse);
router.post('/route', mine, places.route);

module.exports = router;
