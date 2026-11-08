const { jobService } = require('../services/job.service');
const { ServiceError } = require('../services/crane.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { rangeResponse } = require('../utils/range');

const body = (req) => req.body || {};

/** Wraps a handler: runs it, sends { status, message, data } and maps ServiceError to its HTTP code */
const handler = (message, run, statusCode = 200) => async (req, res) => {
  try {
    return successResponse(res, message, await run(req), statusCode);
  } catch (error) {
    if (error instanceof ServiceError) return errorResponse(res, error.message, null, error.statusCode);
    return errorResponse(res, error.message, null, 500);
  }
};

const ranged = (message, run) => async (req, res) => {
  try {
    const { range, items, total } = await run(req);
    return rangeResponse(res, message, items, range, total);
  } catch (error) {
    if (error instanceof ServiceError) return errorResponse(res, error.message, null, error.statusCode);
    return errorResponse(res, error.message, null, 500);
  }
};

const op = (req) => req.user.id;
const job = (req) => body(req).booking_id;

/** Operator app: Home, Jobs, the job steps from accepting to confirming completion, and Earnings. All POST with a JSON payload. */
module.exports = {
  home: handler('Home retrieved successfully.', (req) => jobService.home(op(req))),
  setOnline: handler('Status updated.', (req) => jobService.setOnline(op(req), body(req))),
  updateLocation: handler('Location updated.', (req) => jobService.updateLocation(op(req), body(req))),

  list: ranged('Jobs retrieved successfully.', (req) => jobService.list(op(req), body(req))),
  get: handler('Job retrieved successfully.', (req) => jobService.get(op(req), job(req))),

  accept: handler('Job accepted.', (req) => jobService.accept(op(req), job(req))),
  decline: handler('Job declined.', (req) => jobService.decline(op(req), job(req), body(req).reason)),
  startJourney: handler('Journey started.', (req) => jobService.startJourney(op(req), job(req))),
  arrived: handler('Arrival marked. Waiting for the customer to confirm.', (req) => jobService.arrived(op(req), job(req), body(req))),
  confirmArrival: handler('Arrival confirmed.', (req) => jobService.confirmArrivalManually(op(req), job(req))),
  sitePhotos: handler('Site photos saved.', (req) => jobService.saveSitePhotos(op(req), job(req), body(req).photos)),
  checklist: handler('Checklist retrieved successfully.', (req) => jobService.checklist(op(req), job(req))),
  saveChecklist: handler('Checklist saved.', (req) => jobService.saveChecklist(op(req), job(req), body(req).items)),
  start: handler('Job started.', (req) => jobService.startJob(op(req), job(req))),
  waiting: handler('Waiting time updated.', (req) => jobService.waiting(op(req), job(req), body(req).action)),
  breakdown: handler('Breakdown reported.', (req) => jobService.report(op(req), job(req), 'breakdown', body(req)), 201),
  issue: handler('Issue reported.', (req) => jobService.report(op(req), job(req), 'issue', body(req)), 201),
  emergency: handler('Help requested.', (req) => jobService.report(op(req), job(req), 'emergency', body(req)), 201),
  extensionRespond: handler('Extra time request answered.', (req) => jobService.respondExtension(op(req), job(req), body(req))),
  finish: handler('Job finished.', (req) => jobService.finish(op(req), job(req), body(req))),
  requestConfirmation: handler('Confirmation requested.', (req) => jobService.requestConfirmation(op(req), job(req))),
  confirmCompletion: handler('Job completed successfully.', (req) => jobService.confirmCompletion(op(req), job(req), body(req).otp)),

  earningsSummary: handler('Earnings retrieved successfully.', (req) => jobService.earningsSummary(op(req))),
  earningsList: ranged('Earnings retrieved successfully.', (req) => jobService.earningsList(op(req), body(req))),

  // customer: confirm the operator is at the site
  customerConfirmArrival: handler('Arrival confirmed.', (req) => jobService.customerConfirmArrival(req.user.id, job(req))),

  // owner: assign (or change) the operator of a confirmed booking
  ownerAssignOperator: handler('Operator assigned for this job.', (req) => jobService.ownerAssignOperator(req.user.id, job(req), body(req).operator_id, {
    operatorCode: body(req).operator_code,
    // the commission can be set in the same step (one screen: operator + what they earn)
    commissionType: body(req).commission_type,
    commissionValue: body(req).commission_value
  }))
};
