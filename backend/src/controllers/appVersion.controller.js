const { appVersionService } = require('../services/appVersion.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const handler = (message, run) => async (req, res) => {
  try {
    return successResponse(res, message, await run(req));
  } catch (error) {
    return errorResponse(res, error.statusCode ? error.message : 'Failed to process the app version request', null, error.statusCode || 500);
  }
};

module.exports = {
  // public: the app asks on every launch and when it comes back from the background
  check: handler('App version checked', (req) => appVersionService.check(req.body || {})),
  // Super Admin
  list: handler('App versions retrieved successfully', () => appVersionService.list()),
  save: handler('App version saved successfully', (req) => appVersionService.save(req.body || {}, (req.admin && req.admin.id) || (req.user && req.user.id)))
};
