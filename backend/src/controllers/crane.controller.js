const { craneService, ServiceError } = require('../services/crane.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { parseRange, rangeResponse } = require('../utils/range');

const handle = (res, error) => {
  if (error instanceof ServiceError) return errorResponse(res, error.message, null, error.statusCode);
  if (error.name === 'SequelizeUniqueConstraintError') {
    return errorResponse(res, 'A crane with this registration number already exists.', null, 409);
  }
  return errorResponse(res, error.message, null, 500);
};

// Route params must be UUIDs; anything else would make Postgres throw
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const requireId = (req, res) => {
  const id = req.params.id;
  if (!UUID_RE.test(id)) {
    errorResponse(res, 'Invalid crane id.', null, 400);
    return null;
  }
  return id;
};

class CraneController {
  // ---- Owner ----
  async getFormOptions(req, res) {
    try {
      return successResponse(res, 'Crane form options retrieved successfully.', await craneService.getFormOptions(req.user.id, (req.body || {}).type));
    } catch (error) { return handle(res, error); }
  }

  async listOperators(req, res) {
    try {
      const range = parseRange(req.body);
      if (range.error) return errorResponse(res, range.error, null, 400);
      const { items, total } = await craneService.listOperatorsRange(req.user.id, { ...(req.body || {}), ...range });
      return rangeResponse(res, 'Operators retrieved successfully.', items, range, total);
    } catch (error) { return handle(res, error); }
  }

  async addOperator(req, res) {
    try {
      const operator = await craneService.createOperator(req.user.id, req.body || {});
      return successResponse(res, 'Operator added successfully.', operator, 201);
    } catch (error) { return handle(res, error); }
  }

  async createCrane(req, res) {
    try {
      const crane = await craneService.createCrane(req.user.id, req.body || {});
      return successResponse(res, crane.status_message, crane, 201);
    } catch (error) { return handle(res, error); }
  }

  /**
   * Single read API (POST body only):
   *  - crane_id given  -> that crane's details (object)
   *  - crane_id absent -> list of cranes (array) in the min/max range (default 0 to 10), optionally for one owner_id
   * Crane owners are always scoped to their own cranes; admins may pass any owner_id.
   */
  async getCranes(req, res) {
    try {
      const input = req.body || {};
      const isOwner = !req.admin;
      const ownerId = isOwner ? req.user.id : (input.owner_id || null);

      if (isOwner && input.owner_id && input.owner_id !== req.user.id) {
        return errorResponse(res, 'You can only view your own cranes.', null, 403);
      }
      if (ownerId && !UUID_RE.test(ownerId)) return errorResponse(res, 'Invalid owner_id.', null, 400);

      if (input.crane_id) {
        if (!UUID_RE.test(input.crane_id)) return errorResponse(res, 'Invalid crane_id.', null, 400);
        return successResponse(res, 'Crane details retrieved successfully.', await craneService.getCraneById(input.crane_id, ownerId));
      }
      const range = parseRange(input);
      if (range.error) return errorResponse(res, range.error, null, 400);
      const { items, total } = await craneService.listOwnerCranes(ownerId, range);
      return rangeResponse(res, 'Cranes retrieved successfully.', items, range, total);
    } catch (error) { return handle(res, error); }
  }

  async updateMyCrane(req, res) {
    try {
      const id = requireId(req, res);
      if (!id) return null;
      return successResponse(res, 'Crane updated successfully.', await craneService.updateCrane(req.user.id, id, req.body || {}));
    } catch (error) { return handle(res, error); }
  }

  async saveMyCraneDocuments(req, res) {
    try {
      const id = requireId(req, res);
      if (!id) return null;
      const crane = await craneService.saveDocuments(req.user.id, id, (req.body || {}).documents);
      return successResponse(res, crane.status_message, crane);
    } catch (error) { return handle(res, error); }
  }

  // ---- Admin ----
  async adminList(req, res) {
    try {
      const range = parseRange(req.body);
      if (range.error) return errorResponse(res, range.error, null, 400);
      const { items, total } = await craneService.listAllCranes(req.body || {}, range);
      return rangeResponse(res, 'Cranes retrieved successfully.', items, range, total);
    } catch (error) { return handle(res, error); }
  }

  async adminSummary(req, res) {
    try {
      const { summary } = await craneService.listAllCranes({ limit: 1 });
      return successResponse(res, 'Crane approval summary retrieved successfully.', summary);
    } catch (error) { return handle(res, error); }
  }

  async adminGet(req, res) {
    try {
      const id = (req.body || {}).crane_id;
      if (!UUID_RE.test(id || '')) return errorResponse(res, 'A valid crane_id is required.', null, 400);
      return successResponse(res, 'Crane details retrieved successfully.', await craneService.getCraneById(id));
    } catch (error) { return handle(res, error); }
  }

  async adminApprove(req, res) {
    try {
      const id = requireId(req, res);
      if (!id) return null;
      return successResponse(res, 'Crane approved and marked as Verified.', await craneService.approveCrane(id, req.admin.id));
    } catch (error) { return handle(res, error); }
  }

  async adminReject(req, res) {
    try {
      const id = requireId(req, res);
      if (!id) return null;
      return successResponse(res, 'Crane rejected.', await craneService.rejectCrane(id, req.admin.id, (req.body || {}).reason));
    } catch (error) { return handle(res, error); }
  }
}

module.exports = new CraneController();
