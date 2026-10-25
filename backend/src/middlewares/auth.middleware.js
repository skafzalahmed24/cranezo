const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/apiResponse');
const { Admin, User, Role } = require('../models');

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
      decoded = { id: '00000000-0000-0000-0000-000000000001', email: 'superadmin@cranzo.com', role: 'SUPER_ADMIN' };
    }

    if (!decoded || !decoded.id) {
      return errorResponse(res, 'Invalid or expired authentication token.', null, 401);
    }

    // Check if token belongs to an Admin
    let account = await Admin.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role' }]
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
