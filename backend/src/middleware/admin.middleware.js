const { errorResponse } = require('../utils/apiResponse');
const { ROLES } = require('../utils/constants');

/**
 * Admin-only middleware — must be used AFTER protect middleware
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== ROLES.ADMIN) {
    return errorResponse(res, 'Access denied. Admin only.', 403);
  }
  next();
};

/**
 * General role restriction middleware
 * Usage: restrictTo('investor', 'admin')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. This route is restricted to: ${roles.join(', ')}`,
        403
      );
    }
    next();
  };
};

module.exports = { adminOnly, restrictTo };
