const { customerJobService } = require('../services/customerJob.service');
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

const me = (req) => req.user.id;

/** Customer app after booking: My Jobs, Job Details, extra time, final payment, rating, Track My Cranes. All POST with a JSON payload. */
module.exports = {
  summary: handler('Booking counts retrieved successfully.', (req) => customerJobService.summary(me(req))),
  list: async (req, res) => {
    try {
      const { range, items, total } = await customerJobService.list(me(req), body(req));
      return rangeResponse(res, 'Bookings retrieved successfully.', items, range, total);
    } catch (error) {
      return fail(res, error);
    }
  },
  get: handler('Booking retrieved successfully.', (req) => customerJobService.get(me(req), body(req).booking_id)),
  activeTracking: handler('Active cranes retrieved successfully.', (req) => customerJobService.activeTracking(me(req))),
  pay: handler('Payment completed.', (req) => customerJobService.pay(me(req), body(req).booking_id, body(req).payment_method)),
  rate: handler('Thank you for rating your experience.', (req) => customerJobService.rate(me(req), body(req).booking_id, body(req)), 201),
  requestExtraTime: handler('Extra time requested. Waiting for the operator.', (req) => customerJobService.requestExtraTime(me(req), body(req).booking_id, body(req)), 201),
  cancelExtraTime: handler('Extra time request cancelled.', (req) => customerJobService.cancelExtraTime(me(req), body(req).booking_id))
};
