const { DataTypes } = require('sequelize');

/** A named set of admin panel modules (side menu items), e.g. Finance or Support Agent */
module.exports = (sequelize) => sequelize.define('AdminAccessRole', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  description: { type: DataTypes.STRING(200), allowNull: true },
  permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
}, { tableName: 'admin_access_roles', underscored: true, timestamps: true });
