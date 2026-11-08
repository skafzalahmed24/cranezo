const { Op } = require('sequelize');
const { Admin, AdminAccessRole, Role } = require('../models');
const { hashPassword } = require('../utils/password');
const { MODULES, MODULE_KEYS } = require('../constants/adminPermissions');
const { permissionsOf } = require('../middlewares/adminAccess.middleware');
const { ROLES } = require('../constants/roles');

class AccessError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const roleView = (r, staffCount = 0) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  permissions: r.permissions || [],
  is_active: r.isActive,
  staff_count: staffCount,
  updated_at: r.updatedAt
});

const staffView = (a) => ({
  id: a.id,
  name: a.name,
  email: a.email,
  is_super_admin: !!(a.role && a.role.code === ROLES.SUPER_ADMIN),
  access_role_id: a.accessRoleId || null,
  access_role: a.accessRole ? a.accessRole.name : (a.role && a.role.code === ROLES.SUPER_ADMIN ? 'Super Admin' : null),
  is_active: a.isActive,
  last_login: a.lastLogin,
  created_at: a.createdAt
});

const cleanPermissions = (input) => {
  if (!Array.isArray(input)) throw new AccessError('permissions must be a list of modules.');
  const unknown = input.filter((k) => !MODULE_KEYS.includes(k));
  if (unknown.length) throw new AccessError(`Unknown module: ${unknown.join(', ')}.`);
  return MODULE_KEYS.filter((k) => input.includes(k)); // keeps the menu order, no duplicates
};

const cleanName = (value, label, max = 60) => {
  const v = String(value || '').trim();
  if (!v) throw new AccessError(`${label} is required.`);
  if (v.length > max) throw new AccessError(`${label} can be up to ${max} characters.`);
  return v;
};

const cleanPassword = (value) => {
  const v = String(value || '');
  if (v.length < 8) throw new AccessError('The password must be at least 8 characters.');
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) throw new AccessError('The password must contain letters and numbers.');
  return v;
};

class AdminAccessService {
  catalog() {
    return MODULES;
  }

  /** The signed-in admin: who they are and what the side menu may show */
  me(admin) {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role ? admin.role.code : null,
      access_role: admin.accessRole ? admin.accessRole.name : (admin.role && admin.role.code === ROLES.SUPER_ADMIN ? 'Super Admin' : null),
      permissions: permissionsOf(admin)
    };
  }

  async listRoles() {
    const roles = await AdminAccessRole.findAll({ order: [['name', 'ASC']] });
    const counts = await Admin.findAll({ where: { accessRoleId: { [Op.ne]: null } }, attributes: ['accessRoleId'], raw: true });
    return roles.map((r) => roleView(r, counts.filter((c) => c.accessRoleId === r.id).length));
  }

  async createRole(input = {}) {
    const name = cleanName(input.name, 'name');
    if (await AdminAccessRole.findOne({ where: { name: { [Op.iLike]: name } } })) throw new AccessError('A role with this name already exists.', 409);
    const role = await AdminAccessRole.create({
      name, description: String(input.description || '').trim().slice(0, 200) || null, permissions: cleanPermissions(input.permissions || [])
    });
    return roleView(role);
  }

  async updateRole(id, input = {}) {
    const role = await AdminAccessRole.findByPk(Number(id));
    if (!role) throw new AccessError('Role not found.', 404);
    const updates = {};
    if (input.name !== undefined) {
      const name = cleanName(input.name, 'name');
      const dup = await AdminAccessRole.findOne({ where: { name: { [Op.iLike]: name }, id: { [Op.ne]: role.id } } });
      if (dup) throw new AccessError('A role with this name already exists.', 409);
      updates.name = name;
    }
    if (input.description !== undefined) updates.description = String(input.description || '').trim().slice(0, 200) || null;
    if (input.permissions !== undefined) updates.permissions = cleanPermissions(input.permissions);
    if (input.is_active !== undefined) updates.isActive = !!input.is_active;
    await role.update(updates);
    return roleView(role, await Admin.count({ where: { accessRoleId: role.id } }));
  }

  async deleteRole(id) {
    const role = await AdminAccessRole.findByPk(Number(id));
    if (!role) throw new AccessError('Role not found.', 404);
    if (await Admin.count({ where: { accessRoleId: role.id } })) throw new AccessError('Move the staff logins of this role to another role first.', 409);
    await role.destroy();
    return { deleted: true };
  }

  async listStaff() {
    const rows = await Admin.findAll({
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role' }, { model: AdminAccessRole, as: 'accessRole' }],
      order: [['createdAt', 'ASC']]
    });
    return rows.map(staffView);
  }

  async roleFor(accessRoleId) {
    const role = await AdminAccessRole.findByPk(Number(accessRoleId));
    if (!role) throw new AccessError('Choose an access role.');
    if (!role.isActive) throw new AccessError('This access role is switched off.', 409);
    return role;
  }

  /** A new staff login: its own email and password, and one access role */
  async createStaff(input = {}, creatorId) {
    const name = cleanName(input.name, 'name', 100);
    const email = String(input.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError('Enter a valid email.');
    if (await Admin.findOne({ where: { email } })) throw new AccessError('An admin with this email already exists.', 409);
    const password = cleanPassword(input.password);
    const role = await this.roleFor(input.access_role_id);
    const staffRole = await Role.findOne({ where: { code: ROLES.ADMIN } });
    if (!staffRole) throw new AccessError('The staff account role is missing. Run the database migrations.', 500);
    const admin = await Admin.create({
      name, email, password: await hashPassword(password), roleId: staffRole.id, accessRoleId: role.id, isActive: true, createdBy: creatorId || null
    });
    return (await this.listStaff()).find((s) => s.id === admin.id);
  }

  async updateStaff(id, input = {}, actingId) {
    const admin = await Admin.findByPk(id, { include: [{ model: Role, as: 'role' }] });
    if (!admin) throw new AccessError('Admin not found.', 404);
    const isSuperAccount = admin.role && admin.role.code === ROLES.SUPER_ADMIN;
    if (isSuperAccount && (input.access_role_id !== undefined || input.is_active === false)) {
      throw new AccessError('The Super Admin cannot be limited or switched off here.', 409);
    }
    const updates = {};
    if (input.name !== undefined) updates.name = cleanName(input.name, 'name', 100);
    if (input.access_role_id !== undefined && !isSuperAccount) updates.accessRoleId = (await this.roleFor(input.access_role_id)).id;
    if (input.is_active !== undefined) {
      if (admin.id === actingId && !input.is_active) throw new AccessError('You cannot switch off your own login.', 409);
      updates.isActive = !!input.is_active;
    }
    if (input.password !== undefined && input.password !== '') updates.password = await hashPassword(cleanPassword(input.password));
    await admin.update(updates);
    return (await this.listStaff()).find((s) => s.id === admin.id);
  }
}

module.exports = { adminAccessService: new AdminAccessService(), AccessError };
