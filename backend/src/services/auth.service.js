const { Admin, User, Role, StaticDropdown } = require('../models');
const { comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

class AuthService {
  /**
   * Mobile user sign-up or sign-in with OTP generation
   */
  async registerOrLogin({
    language_id,
    language_type,
    country_code = '+91',
    phone_number,
    mobile_number,
    device_id,
    device_unique_id,
    platform_type,
    device_details
  }) {
    const rawPhone = phone_number || mobile_number;
    if (!rawPhone) {
      throw new Error('phone_number (or mobile_number) is required.');
    }

    const cleanPhone = String(rawPhone).trim();
    const cleanCountryCode = String(country_code).trim();
    const cleanLanguageId = language_id !== undefined ? language_id : language_type;

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
      // Existing user: update OTP, language, and device info
      user.mobileOtp = otp;
      if (cleanLanguageId !== undefined && cleanLanguageId !== null && cleanLanguageId !== '') {
        user.languageType = parseInt(cleanLanguageId, 10);
      }
      if (device_id) user.deviceId = device_id;
      if (device_unique_id) user.deviceUniqueId = device_unique_id;
      if (platform_type) user.platformType = platform_type;
      if (device_details) user.deviceDetails = device_details;
      await user.save();
    } else {
      // New user: create record
      isNewUser = true;
      user = await User.create({
        languageType: cleanLanguageId ? parseInt(cleanLanguageId, 10) : null,
        countryCode: cleanCountryCode,
        mobileNumber: cleanPhone,
        mobileOtp: otp,
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
      otp: otp, // Returned for dev/testing ease
      is_new_user: isNewUser
    };
  }

  /**
   * Verify OTP and check role status
   */
  async verifyOtp({ uuid, user_id, id, otp_number, otp, mobile_otp }) {
    const targetId = uuid || user_id || id;
    const targetOtp = otp_number || otp || mobile_otp;

    if (!targetId) {
      throw new Error('uuid (user id) is required.');
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

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      mobile: user.mobileNumber,
      roleId: user.roleId,
      role: user.role ? user.role.code : null
    });

    return {
      uuid: user.id,
      mobile_number: user.mobileNumber,
      country_code: user.countryCode,
      is_mobile_verified: user.isMobileVerified, // 0
      role_id_status: roleStatus, // 0 for already have, 1 for not have
      has_role: roleStatus,
      role_id: user.roleId || null,
      role_name: user.role ? user.role.name : null,
      full_name: user.fullName || null,
      company_name: user.companyName || null,
      token
    };
  }

  /**
   * Complete / update user profile with role, name, company, and dropdown IDs
   */
  async updateProfile({
    user_id,
    uuid,
    id,
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

    user.roleId = parseInt(role_id, 10);
    user.fullName = String(full_name).trim();
    user.companyName = String(company_name).trim();

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

    // Refresh JWT with newly assigned role
    const token = generateToken({
      id: updatedUser.id,
      mobile: updatedUser.mobileNumber,
      roleId: updatedUser.roleId,
      role: role.code
    });

    return {
      user: updatedUser,
      token
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

    // Generate JWT token
    const token = generateToken({
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
      token
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
