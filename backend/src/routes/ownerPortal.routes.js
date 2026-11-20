const express = require('express');
const router = express.Router();
const staff = require('../controllers/ownerStaff.controller');

// the owner's website: employees register and sign in here (the owner signs in with the normal OTP login)
router.post('/owner/otp', staff.ownerOtp);
router.post('/staff/register', staff.register);
router.post('/staff/login', staff.login);

module.exports = router;
