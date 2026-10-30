const { Op } = require('sequelize');
const { StaticDropdown } = require('../models');
const { DROPDOWN_TYPE_LABELS } = require('../constants/dropdownTypes');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { parseRange, rangeResponse } = require('../utils/range');

const formatDropdown = (d) => ({
  id: d.id,
  name: d.dropdownName,
  description: d.dropdownDescription,
  type: d.dropdownType,
  type_name: DROPDOWN_TYPE_LABELS[d.dropdownType] || `Type ${d.dropdownType}`,
  status: d.dropdownTypeStatus,
  status_label: d.dropdownTypeStatus === 0 ? 'Active' : 'Inactive',
  updated_at: d.updatedAt
});

const parseType = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && DROPDOWN_TYPE_LABELS[n] ? n : null;
};

/**
 * Admin > Settings: manage static dropdown values.
 * Values can only be added or edited (never deleted); to retire a value,
 * edit it to status 1 (inactive) so existing records keep their reference.
 */
class SettingsController {
  async listTypes(req, res) {
    try {
      const rows = await StaticDropdown.findAll({
        attributes: ['dropdownType', 'dropdownTypeStatus'],
        raw: true
      });
      const types = Object.entries(DROPDOWN_TYPE_LABELS).map(([type, name]) => {
        const mine = rows.filter((r) => r.dropdownType === Number(type));
        return {
          type: Number(type),
          name,
          total: mine.length,
          active: mine.filter((r) => r.dropdownTypeStatus === 0).length
        };
      });
      return successResponse(res, 'Dropdown types retrieved successfully.', types);
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }

  async listDropdowns(req, res) {
    try {
      const where = {};
      if ((req.body || {}).type !== undefined && (req.body || {}).type !== '') {
        const type = parseType((req.body || {}).type);
        if (type === null) return errorResponse(res, 'Unknown dropdown type.', null, 400);
        where.dropdownType = type;
      }
      // Unlike the public endpoint, admins also see inactive values
      const range = parseRange(req.body);
      if (range.error) return errorResponse(res, range.error, null, 400);
      const { rows, count } = await StaticDropdown.findAndCountAll({
        where,
        limit: range.limit,
        offset: range.offset,
        order: [['dropdownType', 'ASC'], ['id', 'ASC']]
      });
      return rangeResponse(res, 'Dropdown values retrieved successfully.', rows.map(formatDropdown), range, count);
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }

  async createDropdown(req, res) {
    try {
      const { name, description } = req.body || {};
      const type = parseType(req.body && req.body.type);
      if (type === null) return errorResponse(res, 'A valid dropdown type is required.', null, 400);
      if (!name || !String(name).trim()) return errorResponse(res, 'name is required.', null, 400);

      const clean = String(name).trim();
      const duplicate = await StaticDropdown.findOne({
        where: { dropdownType: type, dropdownName: { [Op.iLike]: clean } },
        attributes: ['id']
      });
      if (duplicate) return errorResponse(res, 'This value already exists for the selected type.', null, 409);

      const row = await StaticDropdown.create({
        dropdownName: clean,
        dropdownDescription: description ? String(description).trim() : clean,
        dropdownType: type,
        dropdownTypeStatus: 0
      });
      return successResponse(res, 'Dropdown value added successfully.', formatDropdown(row), 201);
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }

  async updateDropdown(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return errorResponse(res, 'Invalid dropdown id.', null, 400);
      const row = await StaticDropdown.findByPk(id);
      if (!row) return errorResponse(res, 'Dropdown value not found.', null, 404);

      const { name, description, status } = req.body || {};
      const updates = {};
      if (name !== undefined) {
        const clean = String(name).trim();
        if (!clean) return errorResponse(res, 'name cannot be empty.', null, 400);
        const duplicate = await StaticDropdown.findOne({
          where: { dropdownType: row.dropdownType, dropdownName: { [Op.iLike]: clean }, id: { [Op.ne]: id } },
          attributes: ['id']
        });
        if (duplicate) return errorResponse(res, 'This value already exists for the selected type.', null, 409);
        updates.dropdownName = clean;
      }
      if (description !== undefined) updates.dropdownDescription = description;
      if (status !== undefined) {
        if (![0, 1].includes(Number(status))) return errorResponse(res, 'status must be 0 (active) or 1 (inactive).', null, 400);
        updates.dropdownTypeStatus = Number(status);
      }

      await row.update(updates);
      return successResponse(res, 'Dropdown value updated successfully.', formatDropdown(row));
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  }
}

module.exports = new SettingsController();
