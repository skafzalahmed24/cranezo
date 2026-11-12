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
const { requireAdmin, requireSuperAdmin } = require('../middlewares/role.middleware');
const finance = require('../controllers/finance.controller');
const dbClearController = require('../controllers/dbClear.controller');

const { adminAccessGuard } = require('../middlewares/adminAccess.middleware');
const accessController = require('../controllers/adminAccess.controller');

const adminOnly = [authenticate, requireAdmin];

// Staff only reach the modules of their access role: one guard for every admin call (a call that is not in the
// permission table is closed to staff). The Super Admin passes everywhere.
router.use(authenticate, requireAdmin, adminAccessGuard);

// Who am I and what may I see (every admin), and the Super Admin's roles and staff logins
const superAdminOnly = [authenticate, requireSuperAdmin];
router.post('/me', adminOnly, accessController.me);
router.post('/permissions/catalog', superAdminOnly, accessController.catalog);
router.post('/access-roles/list', superAdminOnly, accessController.listRoles);
router.post('/access-roles', superAdminOnly, accessController.createRole);
router.put('/access-roles/:id', superAdminOnly, accessController.updateRole);
router.delete('/access-roles/:id', superAdminOnly, accessController.deleteRole);
router.post('/staff/list', superAdminOnly, accessController.listStaff);
router.post('/staff', superAdminOnly, accessController.createStaff);
router.put('/staff/:id', superAdminOnly, accessController.updateStaff);

// Protected admin dashboard routes
router.get('/dashboard-stats', adminOnly, adminController.getDashboardStats);
router.post('/dashboard', adminOnly, adminController.getDashboardStats);
router.post('/bookings/list', adminOnly, adminController.bookings);
router.post('/bookings/get', adminOnly, adminController.booking);
router.post('/reviews', adminOnly, adminController.reviews);
router.post('/reports', adminOnly, adminController.reports);
router.post('/alerts', adminOnly, adminController.alerts);

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
router.put('/members/:id/documents', adminOnly, memberController.setDocumentStatus);

// Payments, settlements, complaints. Only the Super Admin can change the platform fee.
router.post('/finance/settings', adminOnly, finance.adminPlatformSettings);
router.put('/finance/settings', [authenticate, requireSuperAdmin], finance.adminSavePlatformSettings);
router.post('/finance/transactions', adminOnly, finance.adminTransactions);
router.post('/finance/transactions/summary', adminOnly, finance.adminTransactionSummary);
router.post('/finance/settlements/balances', adminOnly, finance.adminSettlementBalances);
router.post('/finance/settlements/pending', adminOnly, finance.adminSettlementPending);
router.post('/finance/settlements/settle', adminOnly, finance.adminSettle);
router.post('/finance/settlements', adminOnly, finance.adminSettlements);
router.post('/finance/settlements/get', adminOnly, finance.adminSettlementGet);
// Booking requests ("no crane found" goes here) and pricing rules (Super Admin changes them)
const craneRequests = require('../controllers/craneRequest.controller');
router.post('/crane-requests', adminOnly, craneRequests.adminList);
router.post('/crane-requests/summary', adminOnly, craneRequests.adminSummary);
router.put('/crane-requests/update', adminOnly, craneRequests.adminUpdate);
router.post('/pricing', adminOnly, finance.adminPricing);

// Owner subscriptions: who is on which plan and when it is due; the Super Admin sets prices and days
const subscriptionController = require('../controllers/subscription.controller');
router.post('/subscriptions/list', adminOnly, subscriptionController.list);
router.post('/subscriptions/plans', adminOnly, subscriptionController.plans);
router.put('/subscriptions/plans', [authenticate, requireSuperAdmin], subscriptionController.savePlans);

// App versions and force update (Super Admin only)
const appVersionController = require('../controllers/appVersion.controller');
router.post('/app-version/get', [authenticate, requireSuperAdmin], appVersionController.list);
router.put('/app-version', [authenticate, requireSuperAdmin], appVersionController.save);

// Clear the database (keeps the static data). Super Admin only, and off unless ALLOW_DB_CLEAR=true is set in .env
router.post('/db-clear/preview', [authenticate, requireSuperAdmin], dbClearController.preview);
router.post('/db-clear', [authenticate, requireSuperAdmin], dbClearController.clear);
router.put('/pricing/rules', [authenticate, requireSuperAdmin], finance.adminSaveRules);
router.put('/pricing/minimum', [authenticate, requireSuperAdmin], finance.adminSaveMinimum);
router.post('/complaints', adminOnly, finance.adminComplaints);
router.post('/complaints/summary', adminOnly, finance.adminComplaintSummary);
router.post('/complaints/get', adminOnly, finance.adminComplaintGet);
router.put('/complaints/update', adminOnly, finance.adminComplaintUpdate);

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
