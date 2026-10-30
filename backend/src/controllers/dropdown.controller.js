const { StaticDropdown, Role } = require('../models');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { Op } = require('sequelize');

class DropdownController {
  async getStaticDropdowns(req, res) {
    try {
      // Support input body params, route path params, and query params
      const rawType = req.body?.type ?? req.body?.dropdown_type ?? req.params?.type ?? req.query?.type;

      // Status is not accepted in the payload; always return active (0) dropdowns
      const whereClause = { dropdown_type_status: 0 };

      if (rawType !== undefined && rawType !== null && rawType !== '') {
        whereClause.dropdown_type = parseInt(rawType, 10);
      }

      const dropdowns = await StaticDropdown.findAll({
        where: whereClause,
        order: [['id', 'ASC']]
      });

      return successResponse(res, 'Static dropdown options retrieved successfully.', dropdowns);
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }

  async getRoles(req, res) {
    try {
      const { includeAdmin } = req.query;
      const whereClause = {
        isActive: true
      };

      // Exclude Super Admin (id: 4) from roles listing
      if (includeAdmin !== 'true') {
        whereClause.id = { [Op.ne]: 4 };
        whereClause.code = { [Op.ne]: 'SUPER_ADMIN' };
      }

      const roles = await Role.findAll({
        where: whereClause,
        attributes: ['id', 'name', 'code', 'description', 'image', 'isActive'],
        order: [['id', 'ASC']]
      });

      return successResponse(res, 'Roles with descriptions and images retrieved successfully.', roles);
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }
}

module.exports = new DropdownController();
