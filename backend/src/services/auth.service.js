const { Admin, User, Role, StaticDropdown } = require('../models');
const { comparePassword } = require('../utils/password');
const { generateAuthTokens, verifyRefreshToken } = require('../utils/jwt');
const { generateUniqueMemberId, getRolePrefix } = require('../utils/memberIdGenerator');

class AuthService {
  /**
   * Mobile user sign-up or sign-in with OTP generation
   * Clean standard payload:
   * - phone_number (string, required)
   * - country_code (string, default: '+91')
   * - language_id (integer, optional)
   * - role_id (integer, optional: 1=Crane Owner, 2=Operator, 3=Customer)
   * - device_id (string, optional)
   * - device_unique_id (string, optional)
   * - platform_type (string, optional)
   * - device_details (string, optional)
   */
  async registerOrLogin({
    phone_number,
    country_code = '+91',
    language_id,
    role_id,
    device_id,
    device_unique_id,
    platform_type,
    device_details,
    // Lenient fallbacks for backwards compatibility
    mobile_number,
    language_type,
    role
  }) {
    const rawPhone = phone_number || mobile_number;
    if (!rawPhone) {
      throw new Error('phone_number is required.');
    }

    const cleanPhone = String(rawPhone).trim();
    const cleanCountryCode = String(country_code).trim();
    const cleanLanguageId = language_id !== undefined ? language_id : language_type;

    // Resolve target role_id if passed
    let targetRoleId = role_id !== undefined && role_id !== null && role_id !== ''
      ? parseInt(role_id, 10)
      : null;

    if (!targetRoleId && role) {
      const roleRecord = await Role.findOne({
        where: { code: String(role).toUpperCase().trim() }
      });
      if (roleRecord) targetRoleId = roleRecord.id;
    }

    // Default OTP for testing (default: 123456)
    const otp = process.env.DEFAULT_OTP || '123456';

    let user = await User.findOne({
      where: {
        mobile_number: cleanPhone,
        country_code: cleanCountryCode
      },
      include: [{ model: Role, as: 'role' }]
    });

    let isNewUser = false;

    if (user) {
      // Existing user: update OTP, language, device info, and role if passed
      user.mobileOtp = otp;
      if (cleanLanguageId !== undefined && cleanLanguageId !== null && cleanLanguageId !== '') {
        user.languageType = parseInt(cleanLanguageId, 10);
      }
      if (targetRoleId && (!user.roleId || user.roleId !== targetRoleId)) {
        user.roleId = targetRoleId;
      }
      // Generate member_id if role exists and user does not have one, or prefix mismatch
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
      // New user: create record with role-based member_id if role provided
      isNewUser = true;
      let memberId = null;
      if (targetRoleId) {
        memberId = await generateUniqueMemberId(targetRoleId, User);
      }

      user = await User.create({
        languageType: cleanLanguageId ? parseInt(cleanLanguageId, 10) : null,
        countryCode: cleanCountryCode,
        mobileNumber: cleanPhone,
        mobileOtp: otp,
        roleId: targetRoleId || null,
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

    return {
      uuid: user.id,
      country_code: user.countryCode,
      phone_number: user.mobileNumber,
      member_id: user.memberId || null,
      role_id: user.roleId || null,
      otp: otp, // Default: 123456
      is_new_user: isNewUser
    };
  }

  /**
   * Verify OTP and check role status
   * Clean standard payload:
   * - uuid (string, required)
   * - otp_number (string, required)
   */
  async verifyOtp({
    uuid,
    otp_number,
    // Fallbacks for client backwards compatibility
    user_id,
    id,
    otp,
    mobile_otp
  }) {
    const targetId = uuid || user_id || id;
    const targetOtp = otp_number || otp || mobile_otp;

    if (!targetId) {
      throw new Error('uuid is required.');
    }
    if (!targetOtp) {
      throw new Error('otp_number is required.');
    }

    const user = await User.findByPk(targetId, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user) {
      throw new Error('User not found with the provided uuid.');
    }

    const enteredOtp = String(targetOtp).trim();
    const storedOtp = user.mobileOtp ? String(user.mobileOtp).trim() : null;

    // Verify OTP (also permit test master OTP '123456')
    if (storedOtp !== enteredOtp && enteredOtp !== '123456') {
      throw new Error('Invalid or expired OTP.');
    }

    // Mark as verified (0 for verified in Cranzo schema)
    user.isMobileVerified = 0;
    user.mobileOtp = null;
    await user.save();

    // Check role_id
    // role_id 0 = already have role
    // role_id 1 = already not have role (role_id is null)
    const hasRole = user.roleId !== null && user.roleId !== undefined;
    const roleStatus = hasRole ? 0 : 1;

    // Generate JWT Access & Refresh Tokens
    const tokens = generateAuthTokens({
      id: user.id,
      mobile: user.mobileNumber,
      roleId: user.roleId,
      role: user.role ? user.role.code : null
    });

    return {
      uuid: user.id,
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
      token: tokens.access_token // Backwards compatibility
    };
  }

  /**
   * Complete / update user profile with role, name, company, and dropdown IDs
   * Clean standard payload:
   * - user_id (string, required)
   * - role_id (integer, required: 1, 2, or 3)
   * - full_name (string, required)
   * - company_name (string, required)
   * - dropdown IDs: owner_type, years_of_experience, number_of_business_partners, business_ownership_type
   */
  async updateProfile({
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
    profile_image,
    // Fallback for user_id
    uuid,
    id
  }) {
    const targetId = user_id || uuid || id;
    if (!targetId || !role_id || !full_name || !company_name) {
      throw new Error('user_id, role_id, full_name, and company_name are required.');
    }

    const user = await User.findByPk(targetId);
    if (!user) {
      throw new Error('User not found.');
    }

    // Validate role exists
    const role = await Role.findByPk(parseInt(role_id, 10));
    if (!role) {
      throw new Error('Invalid role_id. Role not found in system.');
    }

    const newRoleId = parseInt(role_id, 10);
    const roleChanged = user.roleId !== newRoleId;
    user.roleId = newRoleId;
    user.fullName = String(full_name).trim();
    user.companyName = String(company_name).trim();

    // Generate or update member_id if missing or role prefix changed
    const expectedPrefix = getRolePrefix(newRoleId);
    if (!user.memberId || roleChanged || !user.memberId.startsWith(expectedPrefix)) {
      user.memberId = await generateUniqueMemberId(newRoleId, User);
    }

    if (owner_type !== undefined && owner_type !== null && owner_type !== '') {
      user.ownerType = parseInt(owner_type, 10);
    }
    if (years_of_experience !== undefined && years_of_experience !== null && years_of_experience !== '') {
      user.yearsOfExperience = parseInt(years_of_experience, 10);
    }
    if (number_of_business_partners !== undefined && number_of_business_partners !== null && number_of_business_partners !== '') {
      user.numberOfBusinessPartners = parseInt(number_of_business_partners, 10);
    }
    if (business_ownership_type !== undefined && business_ownership_type !== null && business_ownership_type !== '') {
      user.businessOwnershipType = parseInt(business_ownership_type, 10);
    }

    if (business_address !== undefined) user.businessAddress = business_address;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (country !== undefined) user.country = country;
    if (pincode !== undefined) user.pincode = pincode;
    if (user_email !== undefined) user.userEmail = user_email;
    if (company_date_establishment !== undefined) user.companyDateEstablishment = company_date_establishment;
    if (business_category !== undefined) user.businessCategory = business_category;
    if (profile_image !== undefined) user.profileImage = profile_image;

    await user.save();

    // Re-fetch with associations
    const updatedUser = await User.findByPk(user.id, {
      include: [
        { model: Role, as: 'role' },
        { model: StaticDropdown, as: 'language' },
        { model: StaticDropdown, as: 'ownerTypeInfo' },
        { model: StaticDropdown, as: 'experienceInfo' },
        { model: StaticDropdown, as: 'partnersInfo' },
        { model: StaticDropdown, as: 'ownershipTypeInfo' }
      ]
    });

    // Refresh JWT Access & Refresh tokens with newly assigned role
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
      token: tokens.access_token // Backwards compatibility
    };
  }

  /**
   * Refresh JWT token pair using refresh_token
   */
  async refreshToken(refresh_token) {
    if (!refresh_token) {
      throw new Error('refresh_token is required.');
    }

    const decoded = verifyRefreshToken(refresh_token);
    if (!decoded || !decoded.id) {
      throw new Error('Invalid or expired refresh token.');
    }

    // Check if user exists
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (user) {
      if (user.isActive === 1 || user.isDeleted === 1) {
        throw new Error('User account is deactivated.');
      }
      const tokens = generateAuthTokens({
        id: user.id,
        mobile: user.mobileNumber,
        roleId: user.roleId,
        role: user.role ? user.role.code : null
      });
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        token: tokens.access_token
      };
    }

    // Check if admin exists
    const admin = await Admin.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (admin) {
      if (!admin.isActive) {
        throw new Error('Admin account is deactivated.');
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

    throw new Error('Account associated with refresh token not found.');
  }

  /**
   * General registration (user / partner onboarding) with unique member_id
   */
  async register({
    full_name,
    email,
    phone_number,
    role_id,
    company_name,
    city,
    country_code = '+91',
    password,
    // Fallback aliases
    name,
    user_email,
    phone,
    mobile_number,
    role,
    companyName
  }) {
    const rawPhone = phone_number || phone || mobile_number;
    const cleanName = full_name || name;
    if (!cleanName || (!email && !user_email && !rawPhone)) {
      throw new Error('full_name, and email or phone_number are required.');
    }

    let targetRoleId = role_id ? parseInt(role_id, 10) : null;
    if (!targetRoleId && role) {
      const foundRole = await Role.findOne({
        where: { code: String(role).toUpperCase().trim() }
      });
      if (foundRole) targetRoleId = foundRole.id;
    }

    const memberId = targetRoleId ? await generateUniqueMemberId(targetRoleId, User) : null;

    const user = await User.create({
      fullName: cleanName,
      userEmail: email || user_email || null,
      mobileNumber: rawPhone ? String(rawPhone).trim() : null,
      countryCode: country_code,
      roleId: targetRoleId,
      memberId: memberId,
      companyName: company_name || companyName || null,
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
      include: [{ model: Role, as: 'role' }]
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
        role: roleCode
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
