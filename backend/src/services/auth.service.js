const { Admin, User, Role, StaticDropdown, AdminAccessRole } = require('../models');
const { comparePassword } = require('../utils/password');
const { generateAuthTokens, verifyRefreshToken } = require('../utils/jwt');
const { generateUniqueMemberId, getRolePrefix } = require('../utils/memberIdGenerator');
const crypto = require('crypto');
const { otpService } = require('./otp.service');
const { ROLE_OWNER, ROLE_OPERATOR, ROLE_CUSTOMER, applyOperatorProfile, applyCustomerProfile } = require('./profile.service');

const MOBILE_ROLES = [ROLE_OWNER, ROLE_OPERATOR, ROLE_CUSTOMER];

class AuthService {
  /**
   * Mobile user sign-up or sign-in with OTP generation
   */
  async registerOrLogin({
    phone_number,
    country_code = '+91',
    language_id,
    role_id,
    device_id,
    device_unique_id,
    platform_type,
    device_details
  }) {
    if (!phone_number) {
      throw new Error('phone_number is required.');
    }

    const cleanPhone = String(phone_number).trim();
    const cleanCountryCode = String(country_code).trim();
    const cleanLanguageId = language_id !== undefined && language_id !== null && language_id !== ''
      ? parseInt(language_id, 10)
      : null;

    let targetRoleId = role_id !== undefined && role_id !== null && role_id !== ''
      ? parseInt(role_id, 10)
      : null;

    // Real codes come from Twilio Verify; the fixed test code (123456) is used only when Twilio is not set up and not in production
    const otp = otpService.testCode();

    if (targetRoleId !== null && !MOBILE_ROLES.includes(targetRoleId)) {
      throw new Error('role_id must be 1 (owner), 2 (operator) or 3 (customer).');
    }

    // One phone number can hold one account per role (owner, operator, customer). Asking for a role the number does not
    // have yet makes a new account for that role; the other accounts are never changed or converted.
    const accounts = await User.findAll({
      where: {
        mobile_number: cleanPhone,
        country_code: cleanCountryCode
      },
      include: [{ model: Role, as: 'role' }],
      order: [['updatedAt', 'DESC']]
    });
    // accounts with a finished profile first, then the most recently used
    accounts.sort((x, y) => (Number(!!y.fullName) - Number(!!x.fullName)) || (new Date(y.updatedAt) - new Date(x.updatedAt)));
    let user = targetRoleId
      ? (accounts.find((a) => a.roleId === targetRoleId) || accounts.find((a) => !a.roleId) || null)
      : (accounts[0] || null); // no role asked: the account used last (an unfinished new role never takes over the login)

    let isNewUser = false;

    if (user) {
      user.mobileOtp = otp;
      if (cleanLanguageId !== null) {
        user.languageType = cleanLanguageId;
      }
      if (targetRoleId && user.roleId !== targetRoleId) {
        user.roleId = targetRoleId;
      }
      if (user.roleId) {
        const expectedPrefix = getRolePrefix(user.roleId);
        if (!user.memberId || !user.memberId.startsWith(expectedPrefix)) {
          user.memberId = await generateUniqueMemberId(user.roleId, User);
        }
      }
      if (device_id) user.deviceId = device_id;
      if (device_unique_id) user.deviceUniqueId = device_unique_id;
      if (platform_type) user.platformType = platform_type;
      if (device_details) user.deviceDetails = device_details;
      await user.save();
    } else {
      isNewUser = true;
      let memberId = null;
      if (targetRoleId) {
        memberId = await generateUniqueMemberId(targetRoleId, User);
      }

      user = await User.create({
        languageType: cleanLanguageId,
        countryCode: cleanCountryCode,
        mobileNumber: cleanPhone,
        mobileOtp: otp,
        roleId: targetRoleId,
        memberId: memberId,
        isMobileVerified: 1, // 1 for not verified yet
        isActive: 0, // 0 for active
        isDeleted: 0, // 0 for not deleted
        deviceId: device_id || null,
        deviceUniqueId: device_unique_id || null,
        platformType: platform_type || null,
        deviceDetails: device_details || null
      });
    }

    await otpService.send(user.countryCode, user.mobileNumber);

    return {
      user_id: user.id,
      country_code: user.countryCode,
      phone_number: user.mobileNumber,
      member_id: user.memberId || null,
      role_id: user.roleId || null,
      // the code is only ever returned for the fixed test code, never for a real SMS code
      otp: otp || undefined,
      is_new_user: isNewUser
    };
  }

  /**
   * Verify OTP and check role status
   */
  async verifyOtp({ user_id, otp_number }) {
    if (!user_id) {
      throw new Error('user_id is required.');
    }
    if (!otp_number) {
      throw new Error('otp_number is required.');
    }

    const user = await User.findByPk(user_id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      throw new Error('User not found with the provided user_id.');
    }

    if (!(await otpService.check(user.countryCode, user.mobileNumber, otp_number))) {
      throw new Error('Invalid or expired OTP.');
    }

    // Mark as verified
    user.isMobileVerified = 0;
    user.mobileOtp = null;
    await user.save();

    // Check role_id: 0 = already has role, 1 = no role yet
    const hasRole = user.roleId !== null && user.roleId !== undefined;
    const roleStatus = hasRole ? 0 : 1;

    // One signed-in device per phone number: this sign-in is the session; every other device is signed out
    const sid = await this.startSession(user);

    // Generate JWT Access & Refresh Tokens
    const tokens = generateAuthTokens({
      id: user.id,
      mobile: user.mobileNumber,
      roleId: user.roleId,
      role: user.role ? user.role.code : null,
      sid
    });

    return {
      user_id: user.id,
      member_id: user.memberId || null,
      phone_number: user.mobileNumber,
      country_code: user.countryCode,
      is_mobile_verified: user.isMobileVerified, // 0
      role_id_status: roleStatus, // 0 for already have, 1 for not have
      has_role: roleStatus,
      role_id: user.roleId || null,
      role_name: user.role ? user.role.name : null,
      full_name: user.fullName || null,
      company_name: user.companyName || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      token: tokens.access_token
    };
  }

  /**
   * Complete / update user profile with role, name, company, and dropdown IDs
   */
  async updateProfile(input = {}) {
    const {
      user_id,
      role_id,
      full_name,
      company_name,
      owner_type,
      years_of_experience,
      number_of_business_partners,
      business_ownership_type,
      business_address,
      city,
      state,
      country,
      pincode,
      user_email,
      company_date_establishment,
      business_category,
      profile_image
    } = input;

    if (!user_id || !role_id || !full_name) {
      throw new Error('user_id, role_id, and full_name are required.');
    }
    // Crane owners register a company; operators and customers have their own required fields
    if (parseInt(role_id, 10) === ROLE_OWNER && !company_name) {
      throw new Error('company_name is required for crane owners.');
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      throw new Error('User not found.');
    }

    const role = await Role.findByPk(parseInt(role_id, 10));
    if (!role) {
      throw new Error('Invalid role_id. Role not found in system.');
    }

    const newRoleId = parseInt(role_id, 10);
    // An account keeps its role for good (one account per role on a phone number): another role is a different
    // account, opened with Switch role. Only an account with no role yet can choose one here.
    if (user.roleId && user.roleId !== newRoleId) {
      throw new Error('This account already has a role. Use Switch role to open your other role.');
    }
    if (!user.roleId) {
      const taken = await User.findOne({
        where: { mobileNumber: user.mobileNumber, countryCode: user.countryCode, roleId: newRoleId },
        attributes: ['id']
      });
      if (taken) throw new Error('This phone number already has an account with that role. Use Switch role.');
    }
    const roleChanged = user.roleId !== newRoleId;
    user.roleId = newRoleId;
    user.fullName = String(full_name).trim();
    if (company_name) user.companyName = String(company_name).trim();

    const expectedPrefix = getRolePrefix(newRoleId);
    if (!user.memberId || roleChanged || !user.memberId.startsWith(expectedPrefix)) {
      user.memberId = await generateUniqueMemberId(newRoleId, User);
    }

    if (newRoleId === ROLE_OPERATOR) {
      await applyOperatorProfile(user, input);
    } else if (newRoleId === ROLE_CUSTOMER) {
      await applyCustomerProfile(user, input);
    }

    if (owner_type !== undefined && owner_type !== null && owner_type !== '') {
      user.ownerType = parseInt(owner_type, 10);
    }
    if (newRoleId !== ROLE_OPERATOR && years_of_experience !== undefined && years_of_experience !== null && years_of_experience !== '') {
      user.yearsOfExperience = parseInt(years_of_experience, 10);
    }
    if (number_of_business_partners !== undefined && number_of_business_partners !== null && number_of_business_partners !== '') {
      user.numberOfBusinessPartners = parseInt(number_of_business_partners, 10);
    }
    if (business_ownership_type !== undefined && business_ownership_type !== null && business_ownership_type !== '') {
      user.businessOwnershipType = parseInt(business_ownership_type, 10);
    }

    if (newRoleId !== ROLE_CUSTOMER) {
      if (business_address !== undefined) user.businessAddress = business_address;
      if (city !== undefined) user.city = city;
      if (state !== undefined) user.state = state;
    }
    if (country !== undefined) user.country = country;
    if (pincode !== undefined) user.pincode = pincode;
    if (user_email !== undefined) user.userEmail = user_email;
    if (newRoleId !== ROLE_CUSTOMER && company_date_establishment !== undefined) user.companyDateEstablishment = company_date_establishment;
    if (business_category !== undefined) user.businessCategory = business_category;
    if (profile_image !== undefined) user.profileImage = profile_image;

    await user.save();

    const updatedUser = await User.findByPk(user.id, {
      include: [
        { model: Role, as: 'role' },
        { model: StaticDropdown, as: 'language' },
        { model: StaticDropdown, as: 'ownerTypeInfo' },
        { model: StaticDropdown, as: 'experienceInfo' },
        { model: StaticDropdown, as: 'partnersInfo' },
        { model: StaticDropdown, as: 'ownershipTypeInfo' },
        { model: StaticDropdown, as: 'operatorTypeInfo' },
        { model: StaticDropdown, as: 'customerTypeInfo' },
        { model: StaticDropdown, as: 'constitutionInfo' },
        { model: StaticDropdown, as: 'natureOfBusinessInfo' },
        { model: StaticDropdown, as: 'stateInfo' },
        { model: User, as: 'ownerAccount', attributes: ['id', 'memberId', 'fullName', 'companyName'] }
      ]
    });

    const tokens = generateAuthTokens({
      id: updatedUser.id,
      mobile: updatedUser.mobileNumber,
      roleId: updatedUser.roleId,
      role: role.code
    });

    return {
      user: updatedUser,
      member_id: updatedUser.memberId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      token: tokens.access_token
    };
  }

  /**
   * Refresh JWT token pair using refresh_token
   */
  async refreshToken(refresh_token) {
    if (!refresh_token) {
      throw Object.assign(new Error('refresh_token is required.'), { statusCode: 401 });
    }

    const decoded = verifyRefreshToken(refresh_token);
    if (!decoded || !decoded.id) {
      throw Object.assign(new Error('Invalid or expired refresh token.'), { statusCode: 401 });
    }

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (user) {
      if (user.isActive === 1 || user.isDeleted === 1) {
        throw Object.assign(new Error('User account is deactivated.'), { statusCode: 401 });
      }
      // signed in on another device since: this device is signed out
      if (user.sessionId && decoded.sid !== user.sessionId) {
        throw Object.assign(new Error('You were signed out because this account was opened on another device.'), { statusCode: 401 });
      }
      const tokens = generateAuthTokens({
        id: user.id,
        mobile: user.mobileNumber,
        roleId: user.roleId,
        role: user.role ? user.role.code : null,
        sid: user.sessionId || undefined
      });
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        token: tokens.access_token
      };
    }

    const admin = await Admin.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (admin) {
      if (!admin.isActive) {
        throw Object.assign(new Error('Admin account is deactivated.'), { statusCode: 401 });
      }
      const roleCode = admin.role ? admin.role.code : 'SUPER_ADMIN';
      const tokens = generateAuthTokens({
        id: admin.id,
        email: admin.email,
        role: roleCode,
        roleId: admin.roleId
      });
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        token: tokens.access_token
      };
    }

    throw Object.assign(new Error('Account associated with refresh token not found.'), { statusCode: 401 });
  }

  /**
   * General registration with unique member_id
   */
  async register({
    full_name,
    email,
    phone_number,
    role_id,
    company_name,
    city,
    country_code = '+91',
    password
  }) {
    if (!full_name || (!email && !phone_number)) {
      throw new Error('full_name, and email or phone_number are required.');
    }

    const cleanPhone = phone_number ? String(phone_number).trim() : null;
    let targetRoleId = role_id ? parseInt(role_id, 10) : null;

    const memberId = targetRoleId ? await generateUniqueMemberId(targetRoleId, User) : null;

    const user = await User.create({
      fullName: full_name.trim(),
      userEmail: email ? email.trim() : null,
      mobileNumber: cleanPhone,
      countryCode: country_code,
      roleId: targetRoleId,
      memberId: memberId,
      companyName: company_name || null,
      city: city || null,
      isActive: 0,
      isMobileVerified: 0
    });

    const roleRecord = targetRoleId ? await Role.findByPk(targetRoleId) : null;
    const tokens = generateAuthTokens({
      id: user.id,
      mobile: user.mobileNumber,
      roleId: user.roleId,
      role: roleRecord ? roleRecord.code : null
    });

    return {
      user,
      member_id: memberId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      token: tokens.access_token
    };
  }

  /**
   * Authenticate admin with email and password
   */
  async login(email, password) {
    const admin = await Admin.findOne({
      where: { email: email.toLowerCase().trim() },
      include: [{ model: Role, as: 'role' }, { model: AdminAccessRole, as: 'accessRole' }]
    });

    if (!admin) {
      throw new Error('Invalid email or password.');
    }

    if (!admin.isActive) {
      throw new Error('Your administrator account is deactivated. Please contact support.');
    }

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const roleCode = admin.role ? admin.role.code : 'SUPER_ADMIN';

    // Generate JWT Access & Refresh tokens
    const tokens = generateAuthTokens({
      id: admin.id,
      email: admin.email,
      role: roleCode,
      roleId: admin.roleId
    });

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        roleId: admin.roleId,
        role: roleCode,
        // what the side menu shows: ["*"] for the Super Admin, else the modules of the access role
        access_role: admin.accessRole ? admin.accessRole.name : (roleCode === 'SUPER_ADMIN' ? 'Super Admin' : null),
        permissions: require('../middlewares/adminAccess.middleware').permissionsOf(admin)
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      token: tokens.access_token
    };
  }

  /**
   * Get current profile (admin or user)
   */
  /**
   * Starts the one allowed session of this phone number (all its accounts share it) and returns its id.
   * Devices signed in before get a push that makes the app check its sign-in (an app whose token is still valid
   * ignores it, so the device that is signing in now is never signed out by it).
   */
  async startSession(user) {
    const sid = crypto.randomUUID();
    const where = { mobileNumber: user.mobileNumber, countryCode: user.countryCode };
    const before = await User.findAll({ where, attributes: ['id', 'pushToken'] });
    // silent: the other roles' accounts change here, but their updatedAt ("last used") must not move
    await User.update({ sessionId: sid, pushToken: null, pushPlatform: null }, { where, silent: true });
    user.sessionId = sid; // eslint-disable-line no-param-reassign
    try {
      const { getMessaging } = require('./notification.service');
      const fcm = getMessaging();
      if (fcm) {
        const tokens = [...new Set(before.map((r) => r.pushToken).filter(Boolean))];
        tokens.forEach((token) => fcm.send({
          token,
          data: { type: 'session_replaced', title: 'Signed out', body: 'Your account was opened on another device.' },
          android: { priority: 'high' }
        }).catch(() => {}));
      }
    } catch (error) {
      // the push is only a hint; the old device is signed out at its next call anyway
    }
    return sid;
  }

  /** The same answer as verifyOtp (tokens + role), for an account that is signed in already */
  async sessionFor(user, extra = {}) {
    const tokens = generateAuthTokens({
      id: user.id,
      mobile: user.mobileNumber,
      roleId: user.roleId,
      role: user.role ? user.role.code : null,
      sid: user.sessionId || undefined
    });
    return {
      user_id: user.id,
      member_id: user.memberId || null,
      phone_number: user.mobileNumber,
      country_code: user.countryCode,
      is_mobile_verified: 0,
      role_id_status: user.roleId ? 0 : 1,
      has_role: user.roleId ? 0 : 1,
      role_id: user.roleId || null,
      role_name: user.role ? user.role.name : null,
      full_name: user.fullName || null,
      company_name: user.companyName || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_in: tokens.expires_in,
      token: tokens.access_token,
      ...extra
    };
  }

  /** The roles this phone number has, and the ones it can still add (for the Switch role screen) */
  async roles(accountId) {
    const me = await User.findByPk(accountId, { include: [{ model: Role, as: 'role' }] });
    if (!me) throw new Error('Account not found.');
    const accounts = await User.findAll({
      where: { mobileNumber: me.mobileNumber, countryCode: me.countryCode, isDeleted: 0, isMobileVerified: 0 },
      include: [{ model: Role, as: 'role' }]
    });
    const byRole = new Map(accounts.map((a) => [a.roleId, a]));
    const all = await Role.findAll({ where: { id: MOBILE_ROLES }, order: [['id', 'ASC']] });
    return all.map((r) => {
      const a = byRole.get(r.id);
      return {
        role_id: r.id,
        role_name: r.name,
        role_code: r.code,
        image: r.image || null,
        registered: !!a,
        // a role added here but never filled in (no name yet): the app takes the person through its profile
        profile_complete: !!(a && a.fullName),
        member_id: a ? a.memberId || null : null,
        full_name: a ? a.fullName || null : null,
        blocked: !!(a && a.isActive === 1),
        is_current: me.roleId === r.id
      };
    });
  }

  /**
   * Switch to another role of the same phone number, signed in already (no new OTP). Opens the account of that
   * role, or makes it when the number does not have it yet (the app then asks for the profile of that role).
   */
  async switchRole(accountId, roleId) {
    const target = parseInt(roleId, 10);
    if (!MOBILE_ROLES.includes(target)) throw new Error('role_id must be 1 (owner), 2 (operator) or 3 (customer).');
    const me = await User.findByPk(accountId, { include: [{ model: Role, as: 'role' }] });
    if (!me) throw new Error('Account not found.');
    if (me.isMobileVerified !== 0) throw new Error('Verify your mobile number first.');
    if (me.roleId === target) return this.sessionFor(me, { switched: false, needs_profile: !me.fullName });

    let row = await User.findOne({
      where: { mobileNumber: me.mobileNumber, countryCode: me.countryCode, roleId: target },
      include: [{ model: Role, as: 'role' }]
    });
    let created = false;
    if (row) {
      if (row.isActive === 1 || row.isDeleted === 1) throw new Error('That account is blocked. Please contact support.');
    } else {
      row = await User.create({
        countryCode: me.countryCode,
        mobileNumber: me.mobileNumber,
        roleId: target,
        memberId: await generateUniqueMemberId(target, User),
        languageType: me.languageType,
        isMobileVerified: 0,
        isActive: 0,
        isDeleted: 0,
        sessionId: me.sessionId || null
      });
      row = await User.findByPk(row.id, { include: [{ model: Role, as: 'role' }] });
      created = true;
    }
    row.sessionId = me.sessionId || null;
    // this phone now works as the new role: it stops receiving the old role's pushes, and a leaving operator goes offline
    row.pushToken = me.pushToken;
    row.pushPlatform = me.pushPlatform;
    await row.save();
    me.pushToken = null;
    me.pushPlatform = null;
    if (me.roleId === ROLE_OPERATOR) me.isOnline = false;
    await me.save();
    return this.sessionFor(row, { switched: true, created, needs_profile: !row.fullName });
  }

  async getProfile(accountId) {
    const admin = await Admin.findByPk(accountId, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role' }]
    });

    if (admin) {
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        roleId: admin.roleId,
        role: admin.role ? admin.role.code : 'SUPER_ADMIN'
      };
    }

    const user = await User.findByPk(accountId, {
      include: [{ model: Role, as: 'role' }]
    });

    if (user) {
      return {
        id: user.id,
        member_id: user.memberId || null,
        name: user.fullName,
        mobileNumber: user.mobileNumber,
        companyName: user.companyName,
        roleId: user.roleId,
        role: user.role ? user.role.code : null
      };
    }

    throw new Error('Account profile not found.');
  }
}

module.exports = new AuthService();
