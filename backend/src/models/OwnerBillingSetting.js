const { DataTypes } = require('sequelize');

/** Crane owner's GST, additional charges and default operator commission */
module.exports = (sequelize) => sequelize.define('OwnerBillingSetting', {
  ownerId: { type: DataTypes.UUID, primaryKey: true, allowNull: false, field: 'owner_id' },
  gstPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: 'gst_percent' },
  gstNumber: { type: DataTypes.STRING(20), allowNull: true, field: 'gst_number' },
  charges: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  defaultCommissionType: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'percent', field: 'default_commission_type' },
  defaultCommissionValue: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'default_commission_value' },
  advancePercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 20, field: 'advance_percent' },
  perKmRate: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'per_km_rate' }
}, { tableName: 'owner_billing_settings', underscored: true, timestamps: true });
