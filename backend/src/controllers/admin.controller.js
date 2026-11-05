const adminService = require('../services/admin.service');
const { ServiceError } = require('../services/crane.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { rangeResponse } = require('../utils/range');

const body = (req) => req.body || {};
const fail = (res, error) => (error instanceof ServiceError
  ? errorResponse(res, error.message, null, error.statusCode)
  : errorResponse(res, error.message, null, 500));
const handler = (message, run) => async (req, res) => {
  try { return successResponse(res, message, await run(req)); } catch (error) { return fail(res, error); }
};

/** Admin panel: dashboard, bookings, reviews, reports and alerts (all live data) */
module.exports = {
  getDashboardStats: handler('Admin dashboard stats retrieved successfully.', () => adminService.getDashboardStats()),
  bookings: async (req, res) => {
    try {
      const { range, items, total } = await adminService.bookings(body(req));
      return rangeResponse(res, 'Bookings retrieved successfully.', items, range, total);
    } catch (error) { return fail(res, error); }
  },
  booking: handler('Booking retrieved successfully.', (req) => adminService.booking(body(req).booking_id)),
  reviews: async (req, res) => {
    try {
      const { range, items, total, summary } = await adminService.reviews(body(req));
      return res.status(200).json({
        status: 1, message: 'Reviews retrieved successfully.', data: items, summary,
        pagination: { min: range.min, max: range.max, count: items.length, total, has_more: range.max < total },
        timestamp: new Date().toISOString()
      });
    } catch (error) { return fail(res, error); }
  },
  reports: handler('Reports retrieved successfully.', (req) => adminService.reports(body(req))),
  alerts: handler('Alerts retrieved successfully.', () => adminService.alerts())
};
