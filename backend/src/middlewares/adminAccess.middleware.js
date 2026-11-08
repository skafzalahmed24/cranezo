const { errorResponse } = require('../utils/apiResponse');
const { ROLES } = require('../constants/roles');
const { MODULES, modulesForCall } = require('../constants/adminPermissions');

const isSuper = (admin) => !!admin && admin.role && admin.role.code === ROLES.SUPER_ADMIN;

/** The module keys this admin may use ("*" in the list means all of them, for the Super Admin) */
const permissionsOf = (admin) => {
  if (isSuper(admin)) return ['*'];
  const role = admin && admin.accessRole;
  return role && role.isActive && Array.isArray(role.permissions) ? role.permissions : [];
};

const can = (admin, key) => {
  const list = permissionsOf(admin);
  return list.includes('*') || list.includes(key);
};

/**
 * Closes admin API calls to staff whose access role does not include the module of the call.
 * Mounted once on the whole /api/admin router (after authenticate), so no route can be forgotten:
 * a call that is not in the table is refused for staff.
 */
const adminAccessGuard = (req, res, next) => {
  const admin = req.admin;
  if (!admin) return next(); // authenticate / requireAdmin answer for non-admin callers
  if (isSuper(admin)) return next();
  const modules = modulesForCall(req.path, req.body);
  if (modules === null) return errorResponse(res, 'Forbidden. This action is only for the Super Admin.', null, 403);
  if (modules.length === 0 || modules.some((m) => can(admin, m))) return next();
  const names = modules.map((m) => (MODULES.find((x) => x.key === m) || { label: m }).label).join(' / ');
  return errorResponse(res, `Forbidden. You do not have access to ${names}.`, null, 403);
};

module.exports = { adminAccessGuard, permissionsOf, can, isSuper };
