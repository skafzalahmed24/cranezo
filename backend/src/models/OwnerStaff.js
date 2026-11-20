const { DataTypes } = require('sequelize');

/** An employee of a crane owner who works in the owner's account on the website, with the permissions the owner gave */
module.exports = (sequelize) => sequelize.define('OwnerStaff', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  ownerId: { type: DataTypes.UUID, allowNull: false, field: 'owner_id' },
  fullName: { type: DataTypes.STRING(120), allowNull: false, field: 'full_name' },
  email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
  mobileNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'mobile_number' },
  passwordHash: { type: DataTypes.STRING, allowNull: false, field: 'password_hash' },
  permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pending' },
  lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' }
}, { tableName: 'owner_staff', underscored: true, timestamps: true });
