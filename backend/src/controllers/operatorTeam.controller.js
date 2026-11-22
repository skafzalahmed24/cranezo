const { operatorTeamService } = require('../services/operatorTeam.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const run = (message, fn) => async (req, res) => {
  try {
    return successResponse(res, message, await fn(req));
  } catch (error) {
    return errorResponse(res, error.message || 'Something went wrong.', null, error.statusCode || 500);
  }
};

module.exports = {
  // owner
  search: run('Operator found.', (req) => operatorTeamService.search(req.user.id, req.body || {})),
  invite: run('Request sent to the operator.', (req) => operatorTeamService.invite(req.user.id, req.body || {})),
  sent: run('Requests retrieved successfully.', (req) => operatorTeamService.sent(req.user.id)),
  cancel: run('Request cancelled.', (req) => operatorTeamService.cancel(req.user.id, (req.body || {}).invite_id)),
  // operator
  received: run('Requests retrieved successfully.', (req) => operatorTeamService.received(req.user.id)),
  respond: run('Answer saved.', (req) => operatorTeamService.respond(req.user.id, req.body || {}))
};
