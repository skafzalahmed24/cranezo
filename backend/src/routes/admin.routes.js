const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const craneController = require('../controllers/crane.controller');
const settingsController = require('../controllers/settings.controller');
const memberController = require('../controllers/member.controller');
const legalController = require('../controllers/legal.controller');
const supportAdminController = require('../controllers/supportAdmin.controller');
const homeController = require('../controllers/home.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');

const adminOnly = [authenticate, requireAdmin];

// Protected admin dashboard routes
router.get('/dashboard-stats', authenticate, adminController.getDashboardStats);

// Crane approvals
router.post('/cranes/summary', adminOnly, craneController.adminSummary);
router.post('/cranes/list', adminOnly, craneController.adminList);
router.post('/cranes/get', adminOnly, craneController.adminGet);
router.put('/cranes/:id/approve', adminOnly, craneController.adminApprove);
router.put('/cranes/:id/reject', adminOnly, craneController.adminReject);

// Users (role 3), Owners (role 1) and Operators (role 2): pass role_id in the body
router.post('/members/list', adminOnly, memberController.list);
router.post('/members/summary', adminOnly, memberController.summary);
router.post('/members/get', adminOnly, memberController.get);
router.put('/members/:id/status', adminOnly, memberController.setStatus);

// Support: requests (customer, operator, owner), FAQs, settings and announcements
router.post('/support/tickets/summary', adminOnly, supportAdminController.ticketSummary);
router.post('/support/tickets/list', adminOnly, supportAdminController.ticketList);
router.post('/support/tickets/get', adminOnly, supportAdminController.ticketGet);
router.post('/support/tickets/reply', adminOnly, supportAdminController.ticketReply);
router.put('/support/tickets/:id', adminOnly, supportAdminController.ticketUpdate);
router.post('/support/faq-categories/list', adminOnly, supportAdminController.categoryList);
router.post('/support/faq-categories', adminOnly, supportAdminController.categoryCreate);
router.put('/support/faq-categories/:id', adminOnly, supportAdminController.categoryUpdate);
router.post('/support/faqs/list', adminOnly, supportAdminController.faqList);
router.post('/support/faqs', adminOnly, supportAdminController.faqCreate);
router.put('/support/faqs/:id', adminOnly, supportAdminController.faqUpdate);
router.post('/support/settings/get', adminOnly, supportAdminController.settingsGet);
router.put('/support/settings', adminOnly, supportAdminController.settingsUpdate);
router.post('/announcements/list', adminOnly, supportAdminController.announcementList);
router.post('/announcements/send', adminOnly, supportAdminController.announcementSend);

// Home banners shown in the apps (add and edit, hide instead of delete)
router.post('/banners/list', adminOnly, homeController.adminList);
router.post('/banners', adminOnly, homeController.adminCreate);
router.put('/banners/:id', adminOnly, homeController.adminUpdate);

// Legal pages shown in the apps (Terms & Conditions, Privacy Policy)
router.post('/legal/list', adminOnly, legalController.list);
router.post('/legal/get', adminOnly, legalController.get);
router.put('/legal/:type', adminOnly, legalController.update);

// Settings: dropdown values (add + edit only, no delete)
router.post('/settings/dropdown-types', adminOnly, settingsController.listTypes);
router.post('/settings/dropdowns/list', adminOnly, settingsController.listDropdowns);
router.post('/settings/dropdowns', adminOnly, settingsController.createDropdown);
router.put('/settings/dropdowns/:id', adminOnly, settingsController.updateDropdown);

module.exports = router;
