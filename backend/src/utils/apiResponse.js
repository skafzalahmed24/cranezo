/**
 * Standardized API Response Helper
 * Maintains status: 1 (success) and status: 0 (error)
 */
const successResponse = (res, message = 'Success', data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    status: 1,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const errorResponse = (res, message = 'An error occurred', error = null, statusCode = 500) => {
  const response = {
    status: 0,
    message,
    timestamp: new Date().toISOString()
  };

  if (error) {
    response.error = typeof error === 'string' ? error : error.message || error;
  }

  return res.status(statusCode).json(response);
};

const paginationResponse = (res, message = 'Success', items = [], page = 1, limit = 10, total = 0) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return res.status(200).json({
    status: 1,
    message,
    data: items,
    pagination: {
      currentPage: parseInt(page, 10),
      perPage: parseInt(limit, 10),
      totalItems: total,
      totalPages
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginationResponse
};
