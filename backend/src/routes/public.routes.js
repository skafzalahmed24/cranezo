const express = require('express');
const router = express.Router();
const leads = require('../controllers/leads.controller');

// The public website: no sign-in. The Join Cranezo form (owners and operators) and the banners the Super Admin made for it.
router.post('/leads', leads.create);
router.post('/leads/options', leads.options);
router.post('/banners', leads.banners);

module.exports = router;
