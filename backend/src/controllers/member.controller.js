const { memberService, MemberServiceError } = require('../services/member.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { parseRange, rangeResponse } = require('../utils/range');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const handle = (res, error) => {
  if (error instanceof MemberServiceError) return errorResponse(res, error.message, null, error.statusCode);
  return errorResponse(res, error.message, null, 500);
};

/** Admin > Users / Owners / Operators (role_id 3 / 1 / 2) */
class MemberController {
  async list(req, res) {
    try {
      const input = req.body || {};
      const range = parseRange(input);
      if (range.error) return errorResponse(res, range.error, null, 400);
      const { items, total } = await memberService.list(input, range);
      return rangeResponse(res, 'Members retrieved successfully.', items, range, total);
    } catch (error) { return handle(res, error); }
  }

  async summary(req, res) {
    try {
      const roleId = memberService.roleIdFor((req.body || {}).role_id);
      return successResponse(res, 'Member summary retrieved successfully.', await memberService.summary(roleId));
    } catch (error) { return handle(res, error); }
  }

  async get(req, res) {
    try {
      const id = (req.body || {}).user_id;
      if (!UUID_RE.test(id || '')) return errorResponse(res, 'A valid user_id is required.', null, 400);
      return successResponse(res, 'Member details retrieved successfully.', await memberService.get(id));
    } catch (error) { return handle(res, error); }
  }

  async setDocumentStatus(req, res) {
    try {
      const id = req.params.id;
      if (!UUID_RE.test(id)) return errorResponse(res, 'Invalid user id.', null, 400);
      const { document, status } = req.body || {};
      const member = await memberService.setDocumentStatus(id, document, status);
      const word = { 0: 'set to pending', 1: 'verified', 2: 'rejected' }[Number(status)];
      return successResponse(res, `Document ${word}.`, member);
    } catch (error) { return handle(res, error); }
  }

  async setStatus(req, res) {
    try {
      const id = req.params.id;
      if (!UUID_RE.test(id)) return errorResponse(res, 'Invalid user id.', null, 400);
      const member = await memberService.setStatus(id, (req.body || {}).status);
      return successResponse(res, member.status === 0 ? 'Member activated.' : 'Member blocked.', member);
    } catch (error) { return handle(res, error); }
  }
}

module.exports = new MemberController();
