const { supportService } = require('../services/support.service');
const { ServiceError } = require('../services/crane.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { rangeResponse } = require('../utils/range');

const body = (req) => req.body || {};

const fail = (res, error) => {
  if (error instanceof ServiceError) return errorResponse(res, error.message, null, error.statusCode);
  return errorResponse(res, error.message, null, 500);
};

const handler = (message, run, statusCode = 200) => async (req, res) => {
  try {
    return successResponse(res, message, await run(req), statusCode);
  } catch (error) {
    return fail(res, error);
  }
};

const ranged = (message, run) => async (req, res) => {
  try {
    const { range, items, total } = await run(req);
    return rangeResponse(res, message, items, range, total);
  } catch (error) {
    return fail(res, error);
  }
};

const adminId = (req) => req.admin.id;

/** Admin panel: support requests, FAQs, support settings and announcements. */
module.exports = {
  ticketSummary: handler('Support summary retrieved successfully.', () => supportService.adminSummary()),
  ticketList: ranged('Support requests retrieved successfully.', (req) => supportService.adminList(body(req))),
  ticketGet: handler('Support request retrieved successfully.', (req) => supportService.adminGet(body(req).ticket_id)),
  ticketReply: handler('Reply sent.', (req) => supportService.adminReply(adminId(req), body(req).ticket_id, body(req)), 201),
  ticketUpdate: handler('Support request updated.', (req) => supportService.adminUpdate(adminId(req), req.params.id, body(req))),

  categoryList: handler('FAQ categories retrieved successfully.', () => supportService.adminCategories()),
  categoryCreate: handler('FAQ category added.', (req) => supportService.adminCreateCategory(body(req)), 201),
  categoryUpdate: handler('FAQ category updated.', (req) => supportService.adminUpdateCategory(req.params.id, body(req))),
  faqList: ranged('FAQs retrieved successfully.', (req) => supportService.adminFaqs(body(req))),
  faqCreate: handler('FAQ added.', (req) => supportService.adminCreateFaq(body(req)), 201),
  faqUpdate: handler('FAQ updated.', (req) => supportService.adminUpdateFaq(req.params.id, body(req))),

  settingsGet: handler('Support settings retrieved successfully.', async () => supportService.formatSettings(await supportService.settings())),
  settingsUpdate: handler('Support settings saved.', (req) => supportService.updateSettings(body(req))),

  announcementList: ranged('Announcements retrieved successfully.', (req) => supportService.adminAnnouncements(body(req))),
  announcementSend: handler('Announcement sent.', (req) => supportService.adminSendAnnouncement(adminId(req), body(req)), 201)
};
