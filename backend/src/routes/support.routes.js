const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { appUserOnly } = require('../middlewares/role.middleware');

// Help & Support (customer, operator, owner). All POST with a JSON payload.
const mine = [authenticate, appUserOnly];

router.post('/home', mine, supportController.home);
router.post('/faq/categories', mine, supportController.faqCategories);
router.post('/faq/list', mine, supportController.faqList);
router.post('/faq/feedback', mine, supportController.faqFeedback);

router.post('/tickets/create', mine, supportController.createTicket);
router.post('/tickets/list', mine, supportController.listTickets);
router.post('/tickets/get', mine, supportController.getTicket);
router.post('/tickets/reply', mine, supportController.reply);
router.post('/tickets/close', mine, supportController.closeTicket);

router.post('/chat', mine, supportController.chat);
router.post('/emergency', mine, supportController.emergency);

module.exports = router;
