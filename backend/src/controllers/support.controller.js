const { supportService } = require('../services/support.service');
const { notificationService } = require('../services/notification.service');
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

/** Help & Support for app users (customer, operator, owner): FAQs, requests, chat, emergency. All POST with a JSON payload. */
module.exports = {
  home: handler('Help & Support retrieved successfully.', (req) => supportService.home(req.user)),
  faqCategories: handler('FAQ categories retrieved successfully.', (req) => supportService.faqCategories(req.user)),
  faqList: ranged('FAQs retrieved successfully.', (req) => supportService.faqList(req.user, body(req))),
  faqFeedback: handler('Thanks for your feedback.', (req) => supportService.faqFeedback(body(req).faq_id, body(req).helpful)),

  createTicket: handler('Your request was sent. We will get back to you soon.', (req) => supportService.createTicket(req.user, body(req)), 201),
  listTickets: ranged('Support requests retrieved successfully.', (req) => supportService.listTickets(req.user, body(req))),
  getTicket: handler('Support request retrieved successfully.', (req) => supportService.getTicket(req.user, body(req).ticket_id)),
  reply: handler('Message sent.', (req) => supportService.reply(req.user, body(req).ticket_id, body(req)), 201),
  closeTicket: handler('Request closed.', (req) => supportService.closeTicket(req.user, body(req).ticket_id)),
  chat: handler('Chat retrieved successfully.', (req) => supportService.chat(req.user)),
  emergency: handler('Emergency request sent.', (req) => supportService.emergency(req.user, body(req)), 201),

  // notifications screen extras
  notificationSummary: handler('Notification summary retrieved successfully.', (req) => notificationService.summary(req.user.id))
};
