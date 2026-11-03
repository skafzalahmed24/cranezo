const { DataTypes } = require('sequelize');

/** A recorded payout: platform <-> owner (admin) or owner -> operator (owner) */
module.exports = (sequelize) => sequelize.define('Settlement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  settlementCode: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: 'settlement_code' },
  kind: { type: DataTypes.STRING(20), allowNull: false },
  direction: { type: DataTypes.STRING(24), allowNull: false },
  ownerId: { type: DataTypes.UUID, allowNull: false, field: 'owner_id' },
  operatorId: { type: DataTypes.UUID, allowNull: true, field: 'operator_id' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  jobsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'jobs_count' },
  method: { type: DataTypes.STRING(20), allowNull: true },
  reference: { type: DataTypes.STRING(80), allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
  settledAt: { type: DataTypes.DATE, allowNull: false, field: 'settled_at' },
  createdByType: { type: DataTypes.STRING(10), allowNull: false, field: 'created_by_type' },
  createdBy: { type: DataTypes.STRING(60), allowNull: true, field: 'created_by' }
}, { tableName: 'settlements', underscored: true, timestamps: true });
