const { adminAccessService, AccessError } = require('../services/adminAccess.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const run = (message, work, status = 200) => async (req, res) => {
  try {
    return successResponse(res, message, await work(req), status);
  } catch (error) {
    return errorResponse(res, error instanceof AccessError ? error.message : 'Could not complete the request', null, error instanceof AccessError ? error.statusCode : 500);
  }
};
const body = (req) => req.body || {};

module.exports = {
  me: run('Profile retrieved successfully.', (req) => adminAccessService.me(req.admin)),
  catalog: run('Modules retrieved successfully.', () => adminAccessService.catalog()),
  listRoles: run('Roles retrieved successfully.', () => adminAccessService.listRoles()),
  createRole: run('Role created.', (req) => adminAccessService.createRole(body(req)), 201),
  updateRole: run('Role saved.', (req) => adminAccessService.updateRole(req.params.id, body(req))),
  deleteRole: run('Role deleted.', (req) => adminAccessService.deleteRole(req.params.id)),
  listStaff: run('Admins retrieved successfully.', () => adminAccessService.listStaff()),
  createStaff: run('Admin login created.', (req) => adminAccessService.createStaff(body(req), req.admin.id), 201),
  updateStaff: run('Admin saved.', (req) => adminAccessService.updateStaff(req.params.id, body(req), req.admin.id))
};
