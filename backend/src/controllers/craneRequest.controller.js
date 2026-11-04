const { ServiceError } = require('../services/crane.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { rangeResponse } = require('../utils/range');
const { craneRequestService: S } = require('../services/craneRequest.service');

/** Rapido-style booking requests: customer, owner and admin. All POST with a JSON payload. */
const body = (req) => req.body || {};
const me = (req) => req.user.id;

const fail = (res, error) => {
  if (error instanceof ServiceError) return errorResponse(res, error.message, null, error.statusCode);
  console.error(error); // eslint-disable-line no-console
  return errorResponse(res, error.message, null, 500);
};
const handler = (message, run) => async (req, res) => {
  try { return successResponse(res, message, await run(req)); } catch (error) { return fail(res, error); }
};
const ranged = (message, run) => async (req, res) => {
  try {
    const { range, items, total } = await run(req);
    return rangeResponse(res, message, items, range, total);
  } catch (error) { return fail(res, error); }
};

module.exports = {
  // customer
  estimate: handler('Price estimate ready.', (req) => S.estimate(me(req), body(req))),
  create: handler('Request sent to crane owners near you.', (req) => S.create(me(req), body(req))),
  get: handler('Request retrieved successfully.', (req) => S.get(me(req), body(req).request_id)),
  active: handler('Active request retrieved successfully.', (req) => S.active(me(req))),
  list: ranged('Requests retrieved successfully.', (req) => S.list(me(req), body(req))),
  raise: handler('Price raised. Owners near you have been told.', (req) => S.raise(me(req), body(req).request_id)),
  autoRaise: handler('Auto raise updated.', (req) => S.setAutoRaise(me(req), body(req))),
  cancel: handler('Request cancelled.', (req) => S.cancel(me(req), body(req).request_id)),
  sendToTeam: handler('Sent to the Cranezo team. We will call you soon.', (req) => S.sendToTeam(me(req), body(req))),
  payAdvance: handler('Advance paid. Your crane is booked.', (req) => S.payAdvance(me(req), body(req))),
  // owner
  ownerList: handler('Crane requests retrieved successfully.', (req) => S.ownerList(me(req))),
  ownerAccept: handler('You got the job. Waiting for the customer to pay the advance.', (req) => S.accept(me(req), body(req))),
  // admin
  adminList: ranged('Crane requests retrieved successfully.', (req) => S.adminList(body(req))),
  adminSummary: handler('Request counts retrieved successfully.', () => S.adminSummary()),
  adminUpdate: handler('Request updated.', (req) => S.adminUpdate(body(req)))
};
