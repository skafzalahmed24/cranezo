const {
  User, Role, StaticDropdown, LegalPage
} = require('../models');
const { DROPDOWN_TYPES } = require('../constants/dropdownTypes');
const { NOTIFICATION_GROUPS, NOTIFICATION_KEYS } = require('../constants/notificationSettings');
const { APPEARANCE_OPTIONS, APPEARANCE_IDS, DEFAULT_APPEARANCE } = require('../constants/appearance');
const { craneService } = require('./crane.service');
const { applyOperatorProfile, applyCustomerProfile, ROLE_OWNER, ROLE_OPERATOR, ROLE_CUSTOMER } = require('./profile.service');

class ProfileError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const STATUS_LABELS = { 0: 'Pending', 1: 'Verified', 2: 'Rejected' };
const DESIGNATION = { [ROLE_OWNER]: 'Crane Owner', [ROLE_OPERATOR]: 'Crane Operator', [ROLE_CUSTOMER]: 'Customer' };

const CUSTOMER_KEYS = [
  'customer_type', 'company_name', 'business_address', 'constitution', 'company_date_establishment',
  'gst_number', 'nature_of_business', 'directors_details', 'finance_head_details', 'branch_offices_details',
  'aadhar_number', 'pan_number', 'city', 'state_id', 'state'
];
const OPERATOR_KEYS = [
  'operator_license_number', 'license_expiry_date', 'years_of_experience', 'operator_type', 'owner_id',
  'operator_license_front', 'operator_license_back', 'aadhar_card_file', 'pan_card_file', 'other_document_file'
];

const includes = [
  { model: Role, as: 'role', attributes: ['id', 'name', 'code'] },
  { model: StaticDropdown, as: 'language', attributes: ['id', 'dropdownName', 'dropdownDescription'] },
  { model: StaticDropdown, as: 'experienceInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'operatorTypeInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'customerTypeInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'constitutionInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'natureOfBusinessInfo', attributes: ['id', 'dropdownName'] },
  { model: StaticDropdown, as: 'stateInfo', attributes: ['id', 'dropdownName'] },
  { model: User, as: 'ownerAccount', attributes: ['id', 'memberId', 'fullName', 'companyName'] }
];

const pick = (info) => (info ? { id: info.id, name: info.dropdownName } : null);
const has = (body, keys) => keys.some((k) => body[k] !== undefined);
const todayIso = () => new Date().toISOString().slice(0, 10);

const statusFields = (status, uploaded = true) => ({
  status: uploaded ? status : null,
  status_label: uploaded ? STATUS_LABELS[status] : 'Not Uploaded'
});

class MyProfileService {
  async load(userId) {
    const user = await User.findOne({ where: { id: userId, isDeleted: 0 }, include: includes });
    if (!user) throw new ProfileError('User not found.', 404);
    return user;
  }

  /** Everything the My Profile screens need, shaped per role */
  async getMe(userId) {
    const u = await this.load(userId);

    const profile = {
      id: u.id,
      member_id: u.memberId,
      role_id: u.roleId,
      role_name: u.role ? u.role.name : null,
      designation: DESIGNATION[u.roleId] || null,
      full_name: u.fullName,
      company_name: u.companyName,
      user_email: u.userEmail,
      country_code: u.countryCode,
      mobile_number: u.mobileNumber,
      contact: [u.countryCode, u.mobileNumber].filter(Boolean).join(' '),
      is_mobile_verified: u.isMobileVerified === 0,
      mobile_can_change: false,
      profile_image: u.profileImage,
      appearance: u.appearance || DEFAULT_APPEARANCE,
      language: u.language
        ? { id: u.language.id, name: u.language.dropdownName, description: u.language.dropdownDescription }
        : null
    };

    if (u.roleId === ROLE_CUSTOMER) profile.customer = this.customerBlock(u);
    if (u.roleId === ROLE_OPERATOR) profile.operator = await this.operatorBlock(u);
    if (u.roleId === ROLE_OWNER) {
      // Basic info only for now; more owner sections will be added later
      profile.owner = {
        company_name: u.companyName,
        business_address: u.businessAddress,
        city: u.city,
        state: u.state,
        pincode: u.pincode
      };
    }

    return profile;
  }

  customerBlock(u) {
    return {
      customer_type: pick(u.customerTypeInfo),
      is_business: !!u.customerTypeInfo && u.customerTypeInfo.dropdownName === 'Business User',
      individual: {
        aadhar_number: u.aadharNumber,
        ...Object.fromEntries(Object.entries(statusFields(u.aadharStatus, !!u.aadharNumber)).map(([k, v]) => [`aadhar_${k}`, v])),
        pan_number: u.panNumber,
        ...Object.fromEntries(Object.entries(statusFields(u.panStatus, !!u.panNumber)).map(([k, v]) => [`pan_${k}`, v])),
        city: u.city,
        state_id: u.stateId,
        state: u.state
      },
      business: {
        company_name: u.companyName,
        business_address: u.businessAddress,
        constitution: pick(u.constitutionInfo),
        company_date_establishment: u.companyDateEstablishment,
        gst_number: u.gstNumber,
        nature_of_business: pick(u.natureOfBusinessInfo),
        directors_details: u.directorsDetails,
        finance_head_details: u.financeHeadDetails,
        branch_offices_details: u.branchOfficesDetails
      }
    };
  }

  async operatorBlock(u) {
    const assigned = await craneService.listOperatorCranes(u.id);
    const crane = assigned[0] || null;
    const expired = u.licenseExpiryDate ? u.licenseExpiryDate < todayIso() : null;

    return {
      operator_type: pick(u.operatorTypeInfo),
      years_of_experience: pick(u.experienceInfo),
      license_number: u.operatorLicenseNumber,
      license_expiry_date: u.licenseExpiryDate,
      license_expired: expired,
      owner: u.ownerAccount
        ? { id: u.ownerAccount.id, member_id: u.ownerAccount.memberId, full_name: u.ownerAccount.fullName, company_name: u.ownerAccount.companyName }
        : null,
      assigned_cranes_count: assigned.length,
      assigned_crane: crane && {
        id: crane.id,
        crane_code: crane.crane_code,
        title: [crane.capacity_name, crane.crane_type_name].filter(Boolean).join(' '),
        model_name: crane.model_name,
        capacity_name: crane.capacity_name,
        crane_type_name: crane.crane_type_name,
        fuel_type_name: crane.fuel_type_name,
        primary_photo: crane.primary_photo,
        location: crane.location,
        approval_status: crane.approval_status,
        approval_label: crane.approval_label
      },
      documents: [
        {
          key: 'operator_license',
          label: 'Operator License',
          subtitle: u.licenseExpiryDate ? `Valid till: ${u.licenseExpiryDate}` : null,
          valid_till: u.licenseExpiryDate,
          expired,
          file_url: u.operatorLicenseFront,
          file_url_back: u.operatorLicenseBack,
          uploaded: !!u.operatorLicenseFront,
          ...statusFields(u.operatorLicenseStatus, !!u.operatorLicenseFront)
        },
        {
          key: 'aadhar_card',
          label: 'Aadhar Card',
          subtitle: null,
          file_url: u.aadharCardFile,
          uploaded: !!u.aadharCardFile,
          ...statusFields(u.aadharStatus, !!u.aadharCardFile)
        },
        {
          key: 'pan_card',
          label: 'PAN Card',
          subtitle: null,
          file_url: u.panCardFile,
          uploaded: !!u.panCardFile,
          ...statusFields(u.panStatus, !!u.panCardFile)
        },
        {
          key: 'other_documents',
          label: 'Other Documents',
          subtitle: 'Insurance, Medical Certificate, etc.',
          file_url: u.otherDocumentFile,
          uploaded: !!u.otherDocumentFile,
          ...statusFields(u.otherDocumentStatus, !!u.otherDocumentFile)
        }
      ]
    };
  }

  /**
   * Personal Information "Save Changes". Send only what changed.
   * Everyone: full_name, profile_image, user_email. Customers and operators can also
   * edit their role fields (same names as updateProfile). Owners: basic fields only for now.
   */
  async update(userId, body = {}) {
    if (body.mobile_number !== undefined || body.phone_number !== undefined || body.country_code !== undefined) {
      throw new ProfileError('Mobile number cannot be changed.');
    }

    const user = await this.load(userId);

    if (body.full_name !== undefined) {
      const name = String(body.full_name).trim();
      if (!name) throw new ProfileError('full_name cannot be empty.');
      user.fullName = name;
    }
    if (body.profile_image !== undefined) user.profileImage = body.profile_image || null;
    if (body.user_email !== undefined) {
      const email = String(body.user_email || '').trim();
      if (email && !/\S+@\S+\.\S+/.test(email)) throw new ProfileError('user_email is invalid.');
      user.userEmail = email || null;
    }

    try {
      if (user.roleId === ROLE_CUSTOMER && has(body, CUSTOMER_KEYS)) await this.applyCustomerEdit(user, body);
      if (user.roleId === ROLE_OPERATOR && has(body, OPERATOR_KEYS)) await this.applyOperatorEdit(user, body);
    } catch (error) {
      // validation errors from the shared profile rules are user facing
      throw error instanceof ProfileError ? error : new ProfileError(error.message);
    }

    await user.save();
    return this.getMe(userId);
  }

  async applyCustomerEdit(user, body) {
    const before = { aadhar: user.aadharNumber, pan: user.panNumber };

    // validate the complete form: stored values + what the user changed
    const current = {
      customer_type: user.customerType,
      company_name: user.companyName,
      business_address: user.businessAddress,
      constitution: user.constitution,
      company_date_establishment: user.companyDateEstablishment,
      gst_number: user.gstNumber,
      nature_of_business: user.natureOfBusiness,
      directors_details: user.directorsDetails,
      finance_head_details: user.financeHeadDetails,
      branch_offices_details: user.branchOfficesDetails,
      aadhar_number: user.aadharNumber,
      pan_number: user.panNumber,
      city: user.city,
      state_id: user.stateId,
      state: user.state
    };
    await applyCustomerProfile(user, { ...current, ...body });

    // identity numbers must be re-verified once they change
    if (user.aadharNumber !== before.aadhar) user.aadharStatus = 0;
    if (user.panNumber !== before.pan) user.panStatus = 0;
  }

  async applyOperatorEdit(user, body) {
    const before = {
      license: user.operatorLicenseNumber,
      front: user.operatorLicenseFront,
      back: user.operatorLicenseBack,
      aadhar: user.aadharCardFile,
      pan: user.panCardFile,
      other: user.otherDocumentFile
    };

    const current = {
      operator_license_number: user.operatorLicenseNumber,
      license_expiry_date: user.licenseExpiryDate,
      years_of_experience: user.yearsOfExperience,
      operator_type: user.operatorType,
      owner_id: user.ownerAccount ? user.ownerAccount.memberId : undefined,
      operator_license_front: user.operatorLicenseFront,
      operator_license_back: user.operatorLicenseBack
    };
    await applyOperatorProfile(user, { ...current, ...body });

    // a replaced document goes back to pending until it is verified again
    if (user.operatorLicenseNumber !== before.license || user.operatorLicenseFront !== before.front || user.operatorLicenseBack !== before.back) {
      user.operatorLicenseStatus = 0;
    }
    if (user.aadharCardFile !== before.aadhar) user.aadharStatus = 0;
    if (user.panCardFile !== before.pan) user.panStatus = 0;
    if (user.otherDocumentFile !== before.other) user.otherDocumentStatus = 0;
  }

  // ---------------- Language ----------------

  async languages(userId) {
    const user = await User.findByPk(userId, { attributes: ['id', 'languageType'] });
    if (!user) throw new ProfileError('User not found.', 404);
    const rows = await StaticDropdown.findAll({
      where: { dropdownType: DROPDOWN_TYPES.LANGUAGE, dropdownTypeStatus: 0 },
      order: [['id', 'ASC']]
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.dropdownName,
      description: r.dropdownDescription,
      selected: r.id === user.languageType
    }));
  }

  async saveLanguage(userId, languageId) {
    const id = Number(languageId);
    if (!Number.isInteger(id)) throw new ProfileError('language_id is required.');
    const language = await StaticDropdown.findOne({
      where: { id, dropdownType: DROPDOWN_TYPES.LANGUAGE, dropdownTypeStatus: 0 },
      attributes: ['id']
    });
    if (!language) throw new ProfileError('language_id is not a valid language.');
    await User.update({ languageType: id }, { where: { id: userId } });
    return this.languages(userId);
  }

  // ---------------- Appearance (light / dark / system) ----------------

  async appearance(userId) {
    const user = await User.findByPk(userId, { attributes: ['id', 'appearance'] });
    if (!user) throw new ProfileError('User not found.', 404);
    const current = user.appearance || DEFAULT_APPEARANCE;
    return APPEARANCE_OPTIONS.map((o) => ({ ...o, selected: o.id === current }));
  }

  async saveAppearance(userId, appearance) {
    const value = String(appearance || '').trim().toLowerCase();
    if (!APPEARANCE_IDS.includes(value)) {
      throw new ProfileError(`appearance must be one of: ${APPEARANCE_IDS.join(', ')}.`);
    }
    await User.update({ appearance: value }, { where: { id: userId } });
    return this.appearance(userId);
  }

  // ---------------- Notification settings ----------------

  async notifications(userId) {
    const user = await User.findByPk(userId, { attributes: ['id', 'notificationPreferences'] });
    if (!user) throw new ProfileError('User not found.', 404);
    const saved = user.notificationPreferences || {};
    return NOTIFICATION_GROUPS.map((g) => ({
      group: g.group,
      items: g.items.map((i) => ({
        key: i.key,
        title: i.title,
        subtitle: i.subtitle,
        enabled: typeof saved[i.key] === 'boolean' ? saved[i.key] : i.default
      }))
    }));
  }

  async saveNotifications(userId, preferences) {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
      throw new ProfileError('preferences must be an object like { "job_updates": true }.');
    }
    const unknown = Object.keys(preferences).filter((k) => !NOTIFICATION_KEYS.includes(k));
    if (unknown.length) throw new ProfileError(`Unknown notification setting: ${unknown.join(', ')}.`);
    if (Object.values(preferences).some((v) => typeof v !== 'boolean')) {
      throw new ProfileError('Every notification setting must be true or false.');
    }

    const user = await User.findByPk(userId, { attributes: ['id', 'notificationPreferences'] });
    if (!user) throw new ProfileError('User not found.', 404);
    await user.update({ notificationPreferences: { ...(user.notificationPreferences || {}), ...preferences } });
    return this.notifications(userId);
  }

  // ---------------- Terms & Privacy ----------------

  async legal(type) {
    const pageType = String(type || '').toLowerCase();
    if (!['terms', 'privacy'].includes(pageType)) throw new ProfileError('type must be "terms" or "privacy".');
    const page = await LegalPage.findOne({ where: { pageType, isActive: 0 } });
    if (!page) throw new ProfileError('Content not found.', 404);
    return {
      type: page.pageType,
      title: page.title,
      intro: page.intro,
      last_updated: page.lastUpdated,
      sections: page.sections.map((s, i) => ({ number: i + 1, ...s }))
    };
  }

  // ---------------- Logout ----------------

  /**
   * Access tokens are stateless JWTs, so the app must delete its stored tokens.
   * Here we only detach this device so push notifications stop going to it.
   */
  async logout(userId) {
    await User.update({ deviceId: null, deviceUniqueId: null, pushToken: null, pushPlatform: null }, { where: { id: userId } });
  }
}

module.exports = { myProfileService: new MyProfileService(), ProfileError };
