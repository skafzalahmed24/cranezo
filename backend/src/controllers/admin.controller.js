const adminService = require('../services/admin.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

class AdminController {
  async getDashboardStats(req, res) {
    try {
      const stats = await adminService.getDashboardStats();
      return successResponse(res, 'Admin dashboard stats retrieved successfully.', stats);
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }
}

module.exports = new AdminController();
