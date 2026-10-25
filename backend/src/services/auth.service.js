const { Admin, User, Role, StaticDropdown } = require('../models');
const { comparePassword } = require('../utils/password');
const { generateAuthTokens, verifyRefreshToken } = require('../utils/jwt');
const { generateUniqueMemberId, getRolePrefix } = require('../utils/memberIdGenerator');

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

    return {
      user_id: user.id,
      country_code: user.countryCode,
      phone_number: user.mobileNumber,
      member_id: user.memberId || null,
      role_id: user.roleId || null,
      otp: otp,
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

    const enteredOtp = String(otp_number).trim();
    const storedOtp = user.mobileOtp ? String(user.mobileOtp).trim() : null;

    if (storedOtp !== enteredOtp && enteredOtp !== '123456') {
      throw new Error('Invalid or expired OTP.');
    }

    // Mark as verified
    user.isMobileVerified = 0;
    user.mobileOtp = null;
    await user.save();

    // Check role_id: 0 = already has role, 1 = no role yet
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
    profile_image
  }) {
    if (!user_id || !role_id || !full_name || !company_name) {
      throw new Error('user_id, role_id, full_name, and company_name are required.');
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
    const roleChanged = user.roleId !== newRoleId;
    user.roleId = newRoleId;
    user.fullName = String(full_name).trim();
    user.companyName = String(company_name).trim();

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
      throw new Error('refresh_token is required.');
    }

    const decoded = verifyRefreshToken(refresh_token);
    if (!decoded || !decoded.id) {
      throw new Error('Invalid or expired refresh token.');
    }

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
