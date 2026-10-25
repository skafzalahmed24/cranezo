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
    }
  }, {
    tableName: 'users',
    underscored: true,
    timestamps: true
  });

  return User;
};
