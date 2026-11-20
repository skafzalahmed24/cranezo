const bcrypt = require('bcryptjs');
const { OwnerStaff, User } = require('../models');
const { generateAccessToken } = require('../utils/jwt');
const { OWNER_PERMISSIONS, PERMISSION_KEYS } = require('../constants/ownerStaff');
const { notificationService } = require('./notification.service');

const OWNER_ROLE_ID = 1;

class StaffError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const view = (s) => ({
  id: s.id,
  full_name: s.fullName,
  email: s.email,
  mobile_number: s.mobileNumber,
  status: s.status,
  permissions: s.permissions || [],
  last_login_at: s.lastLoginAt,
  created_at: s.createdAt
});

const cleanPermissions = (list) => {
  if (!Array.isArray(list)) throw new StaffError('permissions must be a list.');
  const bad = list.filter((p) => !PERMISSION_KEYS.includes(p));
  if (bad.length) throw new StaffError(`Unknown permission: ${bad.join(', ')}.`);
  return [...new Set(list)];
};

class OwnerStaffService {
  permissions() {
    return OWNER_PERMISSIONS;
  }

  /** An employee registers on the website with the owner's ID. The owner approves and chooses their permissions. */
  async register(input = {}) {
    const memberId = String(input.owner_id || '').trim().toUpperCase();
    const fullName = String(input.full_name || '').trim();
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');
    if (!memberId) throw new StaffError('Enter the owner ID (your employer finds it in their profile).');
    if (!fullName) throw new StaffError('Enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new StaffError('Enter a valid email address.');
    if (password.length < 8) throw new StaffError('The password must have at least 8 characters.');
    const owner = await User.findOne({ where: { memberId, roleId: OWNER_ROLE_ID, isDeleted: 0 }, attributes: ['id', 'fullName', 'isActive'] });
    if (!owner || owner.isActive !== 0) throw new StaffError('No crane owner found with this owner ID.', 404);
    if (await OwnerStaff.findOne({ where: { email }, attributes: ['id'] })) throw new StaffError('This email is already registered.', 409);

    const staff = await OwnerStaff.create({
      ownerId: owner.id,
      fullName,
      email,
      mobileNumber: input.mobile_number ? String(input.mobile_number).trim().slice(0, 20) : null,
      passwordHash: await bcrypt.hash(password, 10),
      permissions: [],
      status: 'pending'
    });
    await notificationService.notify(owner.id, {
      type: 'staff_registered',
      title: 'New employee request',
      body: `${fullName} (${email}) wants to work in your account. Open Cranezo on the web to approve and choose what they can do.`,
      data: { staff_id: staff.id }
    }).catch(() => {});
    return { staff_id: staff.id, status: 'pending', message: 'Registered. Your employer must approve you before you can sign in.' };
  }

  /** The owner signs in on the web with the mobile OTP. Only an existing owner account gets a code (no new account is made here). */
  async ownerOtp(input = {}) {
    const phone = String(input.phone_number || '').replace(/\D/g, '');
    if (phone.length < 6) throw new StaffError('Enter your mobile number.');
    const owner = await User.findOne({ where: { mobileNumber: phone, roleId: OWNER_ROLE_ID, isDeleted: 0 }, attributes: ['id', 'isActive'] });
    if (!owner) throw new StaffError('This number is not a crane owner account. Register in the Cranezo app first.', 404);
    if (owner.isActive !== 0) throw new StaffError('This account is blocked. Please contact support.', 403);
    const authService = require('./auth.service');
    const r = await authService.registerOrLogin({ phone_number: phone, country_code: input.country_code || '+91', role_id: OWNER_ROLE_ID });
    return { user_id: r.user_id, otp: r.otp };
  }

  async login(input = {}) {
    const email = String(input.email || '').trim().toLowerCase();
    const staff = await OwnerStaff.findOne({ where: { email } });
    if (!staff || !(await bcrypt.compare(String(input.password || ''), staff.passwordHash))) throw new StaffError('Wrong email or password.', 401);
    if (staff.status === 'pending') throw new StaffError('Your employer has not approved you yet.', 403);
    if (staff.status !== 'active') throw new StaffError('Your access has been stopped. Please contact your employer.', 403);
    const owner = await User.findByPk(staff.ownerId, { attributes: ['id', 'fullName', 'companyName', 'isActive', 'isDeleted'] });
    if (!owner || owner.isActive !== 0 || owner.isDeleted !== 0) throw new StaffError('The owner account is not active.', 403);
    await staff.update({ lastLoginAt: new Date() });
    const token = generateAccessToken({ id: staff.id, type: 'owner_staff' });
    return { token, access_token: token, staff: view(staff), owner: { id: owner.id, name: owner.companyName || owner.fullName } };
  }

  async me(staff) {
    const owner = await User.findByPk(staff.ownerId, { attributes: ['id', 'fullName', 'companyName'] });
    return { staff: view(staff), owner: owner ? { id: owner.id, name: owner.companyName || owner.fullName } : null };
  }

  // ---------------------------------------------------------------- the owner manages the team

  async list(ownerId) {
    const rows = await OwnerStaff.findAll({ where: { ownerId }, order: [['createdAt', 'DESC']] });
    return { items: rows.map(view), permissions: OWNER_PERMISSIONS };
  }

  async mine(ownerId, id) {
    const s = await OwnerStaff.findOne({ where: { id: String(id || ''), ownerId } });
    if (!s) throw new StaffError('Employee not found.', 404);
    return s;
  }

  /** Approve, block or re-open an employee and set what they may do */
  async update(ownerId, input = {}) {
    const s = await this.mine(ownerId, input.staff_id);
    const changes = {};
    if (input.status !== undefined) {
      if (!['active', 'blocked', 'pending'].includes(input.status)) throw new StaffError('status must be active, blocked or pending.');
      changes.status = input.status;
    }
    if (input.permissions !== undefined) changes.permissions = cleanPermissions(input.permissions);
    if ((changes.status || s.status) === 'active' && !(changes.permissions || s.permissions).length) {
      throw new StaffError('Choose at least one thing this employee may do.');
    }
    await s.update(changes);
    return view(s);
  }

  async remove(ownerId, id) {
    const s = await this.mine(ownerId, id);
    await s.destroy();
    return { removed: true };
  }
}

module.exports = { ownerStaffService: new OwnerStaffService(), StaffError };
