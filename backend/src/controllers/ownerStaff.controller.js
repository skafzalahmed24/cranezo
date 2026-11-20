const { ownerStaffService: S, StaffError } = require('../services/ownerStaff.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const handler = (message, run) => async (req, res) => {
  try {
    return successResponse(res, message, await run(req));
  } catch (error) {
    return errorResponse(res, error.message, null, error instanceof StaffError ? error.statusCode : 500);
  }
};
const body = (req) => req.body || {};
// when an employee is signed in, req.user is the owner's account; the owner id is the same either way
const owner = (req) => req.user.id;

module.exports = {
  register: handler('Registered. Your employer must approve you before you can sign in.', (req) => S.register(body(req))),
  ownerOtp: handler('Code sent.', (req) => S.ownerOtp(body(req))),
  viewAs: handler('Owner view opened.', (req) => S.viewAs(req.admin, body(req))),
  login: handler('Signed in.', (req) => S.login(body(req))),
  me: handler('Retrieved successfully.', (req) => (req.staff ? S.me(req.staff) : Promise.resolve({ staff: null, owner: { id: req.user.id, name: req.user.companyName || req.user.fullName }, is_owner: true }))),
  list: handler('Employees retrieved successfully.', (req) => S.list(owner(req))),
  create: handler('Employee added.', (req) => S.create(owner(req), body(req))),
  update: handler('Employee updated.', (req) => S.update(owner(req), body(req))),
  remove: handler('Employee removed.', (req) => S.remove(owner(req), body(req).staff_id))
};
