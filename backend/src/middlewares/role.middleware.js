const { errorResponse } = require('../utils/apiResponse');
const { ROLES } = require('../constants/roles');

// req.user is a Sequelize account with an included `role` model (or a plain string)
const roleCode = (user) => (user && user.role && typeof user.role === 'object' ? user.role.code : user && user.role);

/**
 * Middleware to restrict access based on user role
 * @param  {...string} allowedRoles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', null, 401);
    }

    const code = roleCode(req.user);

    // SUPER_ADMIN has master override access to everything
    if (code === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(code)) {
      return errorResponse(
        res,
        `Forbidden. Access restricted to [${allowedRoles.join(', ')}]. Your role is ${code}.`,
        null,
        403
      );
    }

    next();
  };
};

/**
 * Crane owners, and brand-new accounts that have no role yet: during sign-up the plan screen (free month / monthly / yearly)
 * opens right after "Crane Owner" is chosen, before the profile is saved and the role is stored.
 */
const ownerOrNewSignup = (req, res, next) => {
  if (!req.user) return errorResponse(res, 'Authentication required.', null, 401);
  if (req.admin) return authorize(ROLES.CRANE_OWNER)(req, res, next);
  if (!roleCode(req.user) && !req.user.roleId) return next();
  return authorize(ROLES.CRANE_OWNER)(req, res, next);
};

/** Only authenticated admin accounts (req.admin is set by authenticate) */
const requireAdmin = (req, res, next) => {
  if (!req.admin) {
    return errorResponse(res, 'Forbidden. Admin access only.', null, 403);
  }
  next();
};

/** Only the Super Admin (platform fee and other money settings) */
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) return errorResponse(res, 'Forbidden. Admin access only.', null, 403);
  if (roleCode(req.user) !== ROLES.SUPER_ADMIN) {
    return errorResponse(res, 'Forbidden. Only the Super Admin can change this setting.', null, 403);
  }
  next();
};

/** Mobile app accounts only (customer, operator, owner), not admin panel accounts */
const appUserOnly = (req, res, next) => {
  if (req.admin) {
    return errorResponse(res, 'This API is for app users, not admin accounts.', null, 403);
  }
  next();
};

module.exports = {
  ownerOrNewSignup,
  authorize,
  requireAdmin,
  requireSuperAdmin,
  appUserOnly
};
