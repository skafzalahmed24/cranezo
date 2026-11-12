const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    languageType: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'language_type',
      comment: 'Static dropdown ID for language (1: English, 2: Telugu, 3: Hindi)'
    },
    countryCode: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '+91',
      field: 'country_code'
    },
    mobileNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'mobile_number'
    },
    mobileOtp: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'mobile_otp'
    },
    isMobileVerified: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'is_mobile_verified',
      comment: '0 for verified, 1 for not verified'
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'role_id'
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'owner_id',
      comment: 'Crane owner (users.id) who added this operator; NULL for self-registered users'
    },
    memberId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      field: 'member_id'
    },
    member_id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('memberId') || null;
      }
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'profile_image'
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'full_name'
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'company_name'
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'user_email',
      validate: {
        isEmailOrEmpty(value) {
          if (value && !/\S+@\S+\.\S+/.test(value)) {
            throw new Error('Invalid email address format.');
          }
        }
      }
    },
    businessAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'business_address'
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'India'
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    yearsOfExperience: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'years_of_experience',
      comment: 'Static dropdown ID for Years of Experience'
    },
    numberOfBusinessPartners: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'number_of_business_partners',
      comment: 'Static dropdown ID for Number of Partners'
    },
    businessOwnershipType: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'business_ownership_type',
      comment: 'Static dropdown ID for Business Ownership Type'
    },
    companyDateEstablishment: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'company_date_establishment'
    },
    businessCategory: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'business_category'
    },
    ownerType: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'owner_type',
      comment: 'Static dropdown ID for Owner Type'
    },
    operatorLicenseNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'operator_license_number' },
    licenseExpiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'license_expiry_date' },
    operatorType: { type: DataTypes.INTEGER, allowNull: true, field: 'operator_type', comment: 'Static dropdown ID (type 10)' },
    operatorLicenseFront: { type: DataTypes.STRING, allowNull: true, field: 'operator_license_front' },
    operatorLicenseBack: { type: DataTypes.STRING, allowNull: true, field: 'operator_license_back' },
    voterIdFile: { type: DataTypes.STRING, allowNull: true, field: 'voter_id_file' },
    aadharCardFile: { type: DataTypes.STRING, allowNull: true, field: 'aadhar_card_file' },
    panCardFile: { type: DataTypes.STRING, allowNull: true, field: 'pan_card_file' },
    otherDocumentFile: { type: DataTypes.STRING, allowNull: true, field: 'other_document_file' },
    customerType: { type: DataTypes.INTEGER, allowNull: true, field: 'customer_type', comment: 'Static dropdown ID (type 11)' },
    constitution: { type: DataTypes.INTEGER, allowNull: true, comment: 'Static dropdown ID (type 12)' },
    natureOfBusiness: { type: DataTypes.INTEGER, allowNull: true, field: 'nature_of_business', comment: 'Static dropdown ID (type 13)' },
    stateId: { type: DataTypes.INTEGER, allowNull: true, field: 'state_id', comment: 'Static dropdown ID (type 14)' },
    gstNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'gst_number' },
    aadharNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'aadhar_number' },
    panNumber: { type: DataTypes.STRING(15), allowNull: true, field: 'pan_number' },
    directorsDetails: { type: DataTypes.TEXT, allowNull: true, field: 'directors_details' },
    financeHeadDetails: { type: DataTypes.TEXT, allowNull: true, field: 'finance_head_details' },
    branchOfficesDetails: { type: DataTypes.TEXT, allowNull: true, field: 'branch_offices_details' },
    operatorLicenseStatus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'operator_license_status', comment: '0 pending, 1 verified, 2 rejected' },
    voterIdStatus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'voter_id_status', comment: '0 pending, 1 verified, 2 rejected' },
    aadharStatus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'aadhar_status', comment: '0 pending, 1 verified, 2 rejected' },
    panStatus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'pan_status', comment: '0 pending, 1 verified, 2 rejected' },
    otherDocumentStatus: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'other_document_status', comment: '0 pending, 1 verified, 2 rejected' },
    pushToken: { type: DataTypes.STRING(512), allowNull: true, field: 'push_token' },
    pushPlatform: { type: DataTypes.STRING(20), allowNull: true, field: 'push_platform' },
    ratingAverage: { type: DataTypes.DECIMAL(3, 2), allowNull: true, field: 'rating_average' },
    ratingCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'rating_count' },
    isOnline: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_online' },
    onlineUpdatedAt: { type: DataTypes.DATE, allowNull: true, field: 'online_updated_at' },
    appearance: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'system', comment: 'light, dark or system' },
    notificationPreferences: { type: DataTypes.JSONB, allowNull: true, field: 'notification_preferences' },
    isActive: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'is_active',
      comment: '0 for active, 1 for deactive'
    },
    isDeleted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'is_deleted',
      comment: '0 for active, 1 for deactive'
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'device_id'
    },
    deviceUniqueId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'device_unique_id'
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'platform_type'
    },
    deviceDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'device_details'
    },
    // the one signed-in device of this phone number (changes at every OTP sign-in; see auth.middleware)
    sessionId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'session_id'
    }
  }, {
    tableName: 'users',
    underscored: true,
    timestamps: true
  });

  return User;
};
