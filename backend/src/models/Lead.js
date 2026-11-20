const { DataTypes } = require('sequelize');

/** Someone who filled in the Join Cranezo form on the website (a crane owner or an operator) */
module.exports = (sequelize) => sequelize.define('Lead', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  kind: { type: DataTypes.STRING(10), allowNull: false },
  fullName: { type: DataTypes.STRING(160), allowNull: false, field: 'full_name' },
  mobileNumber: { type: DataTypes.STRING(20), allowNull: false, field: 'mobile_number' },
  city: { type: DataTypes.STRING(200), allowNull: true },
  answers: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'new' },
  note: { type: DataTypes.TEXT, allowNull: true },
  source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'website' }
}, { tableName: 'leads', underscored: true, timestamps: true });
