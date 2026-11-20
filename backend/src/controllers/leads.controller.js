const { leadsService: S, LeadError } = require('../services/leads.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { rangeResponse } = require('../utils/range');

const fail = (res, error) => errorResponse(res, error instanceof LeadError ? error.message : 'Could not complete the request', null, error instanceof LeadError ? error.statusCode : 500);
const handler = (message, run) => async (req, res) => {
  try {
    return successResponse(res, message, await run(req));
  } catch (error) {
    return fail(res, error);
  }
};
const body = (req) => req.body || {};

module.exports = {
  // public website
  create: handler('Thank you! We received your details and will call you soon.', (req) => S.create(body(req), req.ip)),
  options: handler('Options retrieved.', () => S.options()),
  banners: handler('Banners retrieved.', () => S.websiteBanners()),
  // admin
  list: async (req, res) => {
    try {
      const { range, items, total } = await S.list(body(req));
      return rangeResponse(res, 'Leads retrieved successfully.', items, range, total);
    } catch (error) {
      return fail(res, error);
    }
  },
  summary: handler('Lead counts retrieved.', () => S.summary()),
  update: handler('Lead updated.', (req) => S.update(body(req)))
};
