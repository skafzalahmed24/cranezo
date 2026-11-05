const { ownerJobService } = require('../services/ownerJob.service');
const { ServiceError } = require('../services/crane.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { rangeResponse } = require('../utils/range');

const body = (req) => req.body || {};

const fail = (res, error) => {
  if (error instanceof ServiceError) return errorResponse(res, error.message, null, error.statusCode);
  return errorResponse(res, error.message, null, 500);
};

const handler = (message, run) => async (req, res) => {
  try {
    return successResponse(res, message, await run(req));
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

const owner = (req) => req.user.id;

/** Crane Owner app: Jobs tabs, job details, live location, evidence and Earnings. All POST with a JSON payload. */
module.exports = {
  home: handler('Home retrieved successfully.', (req) => ownerJobService.home(owner(req))),
  summary: handler('Job counts retrieved successfully.', (req) => ownerJobService.summary(owner(req))),
  list: ranged('Jobs retrieved successfully.', (req) => ownerJobService.list(owner(req), body(req))),
  get: handler('Job retrieved successfully.', (req) => ownerJobService.get(owner(req), body(req).booking_id)),
  track: handler('Tracking retrieved successfully.', (req) => ownerJobService.track(owner(req), body(req).booking_id)),
  evidence: handler('Job evidence retrieved successfully.', (req) => ownerJobService.evidence(owner(req), body(req).booking_id)),
  earningsSummary: handler('Earnings retrieved successfully.', (req) => ownerJobService.earningsSummary(owner(req), body(req))),
  earningsTrend: handler('Earnings trend retrieved successfully.', (req) => ownerJobService.earningsTrend(owner(req), body(req))),
  earningsJobs: ranged('Completed jobs retrieved successfully.', (req) => ownerJobService.earningsJobs(owner(req), body(req)))
};
