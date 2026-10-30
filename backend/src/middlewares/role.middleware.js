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

/** Only authenticated admin accounts (req.admin is set by authenticate) */
const requireAdmin = (req, res, next) => {
  if (!req.admin) {
    return errorResponse(res, 'Forbidden. Admin access only.', null, 403);
  }
  next();
};

module.exports = {
  authorize,
  requireAdmin
};
