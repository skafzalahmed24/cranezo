const { conductService: S, ConductError } = require('../services/conduct.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const handler = (message, run) => async (req, res) => {
  try {
    return successResponse(res, message, await run(req));
  } catch (error) {
    return errorResponse(res, error.message, null, error instanceof ConductError ? error.statusCode : 500);
  }
};
const body = (req) => req.body || {};

module.exports = {
  // Super Admin
  attention: handler('Operators needing attention retrieved.', () => S.attention()),
  detail: handler('Operator conduct retrieved.', (req) => S.detail(body(req).operator_id)),
  giveCard: handler('Card given.', (req) => S.giveCard(req.admin, body(req))),
  clear: handler('Restriction cleared.', (req) => S.clear(req.admin, body(req))),
  rules: handler('Rules retrieved.', () => S.rules()),
  saveRules: handler('Rules saved.', (req) => S.saveRules(req.admin, body(req))),
  // operator
  safetyAck: handler('Thank you.', (req) => S.ackSafety(req.user.id))
};
