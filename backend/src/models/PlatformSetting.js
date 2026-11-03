const { DataTypes } = require('sequelize');

/** Super Admin settings (key/value), e.g. platform_fee_percent */
module.exports = (sequelize) => sequelize.define('PlatformSetting', {
  key: { type: DataTypes.STRING(60), primaryKey: true, allowNull: false },
  value: { type: DataTypes.JSONB, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  updatedBy: { type: DataTypes.STRING(60), allowNull: true, field: 'updated_by' }
}, { tableName: 'platform_settings', underscored: true, timestamps: true });
