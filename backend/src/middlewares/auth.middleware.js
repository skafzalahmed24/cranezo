const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/apiResponse');
const { Admin, User, Role, AdminAccessRole, OwnerStaff } = require('../models');
const { permissionForPath, viewOnlyAllowed } = require('../constants/ownerStaff');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access denied. Bearer token missing.', null, 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded = verifyToken(token);

    // Support pre-configured default admin token from .env
    if ((!decoded || !decoded.id) && process.env.DEFAULT_AUTH_TOKEN && token === process.env.DEFAULT_AUTH_TOKEN) {
      decoded = { id: '00000000-0000-0000-0000-000000000001', email: 'superadmin@cranezo.com', role: 'SUPER_ADMIN' };
    }

    if (!decoded || !decoded.id) {
      return errorResponse(res, 'Invalid or expired authentication token.', null, 401);
    }

    // The Super Admin looking into an owner's account: reads only
    if (decoded.type === 'owner_view') {
      const owner = await User.findByPk(decoded.id, { include: [{ model: Role, as: 'role' }] });
      if (!owner || owner.isDeleted === 1) return errorResponse(res, 'Owner not found.', null, 404);
      if (!viewOnlyAllowed(req.originalUrl)) return errorResponse(res, 'View only: the Super Admin cannot change anything while viewing an owner account.', null, 403);
      req.user = owner;
      req.admin = null;
      req.viewer = { adminId: decoded.by };
      return next();
    }

    // An owner's employee: acts as the owner, but only on what the owner allowed
    if (decoded.type === 'owner_staff') {
      const staff = await OwnerStaff.findByPk(decoded.id);
      if (!staff || staff.status !== 'active') return errorResponse(res, 'Your access has been stopped. Please contact your employer.', null, 403);
      const owner = await User.findByPk(staff.ownerId, { include: [{ model: Role, as: 'role' }] });
      if (!owner || owner.isActive === 1 || owner.isDeleted === 1) return errorResponse(res, 'The owner account is not active.', null, 403);
      const need = permissionForPath(req.originalUrl);
      const allowed = need === 'self' || (need && need !== 'owner_only' && (staff.permissions || []).includes(need));
      if (!allowed) return errorResponse(res, 'You do not have permission for this. Ask the owner to allow it.', null, 403);
      req.user = owner;
      req.admin = null;
      req.staff = staff;
      return next();
    }

    // Check if token belongs to an Admin
    let account = await Admin.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role' }, { model: AdminAccessRole, as: 'accessRole' }]
    });

    if (account) {
      if (!account.isActive) {
        return errorResponse(res, 'Admin account is deactivated.', null, 403);
      }
      req.admin = account;
      req.user = account;
      return next();
    }

    // Check if token belongs to a User
    account = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!account) {
      return errorResponse(res, 'Authenticated account not found.', null, 401);
    }

    if (account.isActive === 1 || account.isDeleted === 1) {
      return errorResponse(res, 'User account is deactivated.', null, 403);
    }

    // one signed-in device per phone number: a sign-in on another phone made a new session id, so this token is old
    if (account.sessionId && decoded.sid !== account.sessionId) {
      return errorResponse(res, 'You were signed out because this account was opened on another device.', { code: 'SESSION_REPLACED' }, 401);
    }

    // operators: remember the last time the app was used (7 quiet days = needs attention)
    if (account.roleId === 2) require('../services/conduct.service').conductService.touch(account).catch(() => {});
    req.user = account;
    req.admin = null;
    next();
  } catch (error) {
    return errorResponse(res, 'Authentication error.', error.message, 500);
  }
};

module.exports = {
  authenticate
};
