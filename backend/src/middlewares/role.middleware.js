const { errorResponse } = require('../utils/apiResponse');
const { ROLES } = require('../constants/roles');

/**
 * Middleware to restrict access based on user role
 * @param  {...string} allowedRoles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', null, 401);
    }

    // SUPER_ADMIN has master override access to everything
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Forbidden. Access restricted to [${allowedRoles.join(', ')}]. Your role is ${req.user.role}.`,
        null,
        403
      );
    }

    next();
  };
};

module.exports = {
  authorize
};
