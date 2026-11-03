const { homeService } = require('../services/home.service');
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

/** Home screen data for the apps and banner management for the admin panel. */
module.exports = {
  banners: handler('Banners retrieved successfully.', (req) => homeService.activeBanners(req.user, body(req).placement || 'home')),
  customerHome: handler('Home retrieved successfully.', (req) => homeService.customerHome(req.user)),

  adminList: async (req, res) => {
    try {
      const { range, items, total } = await homeService.adminList(body(req));
      return rangeResponse(res, 'Banners retrieved successfully.', items, range, total);
    } catch (error) {
      return fail(res, error);
    }
  },
  adminCreate: handler('Banner added.', (req) => homeService.adminCreate(req.admin.id, body(req)), 201),
  adminUpdate: handler('Banner updated.', (req) => homeService.adminUpdate(req.params.id, body(req)))
};
