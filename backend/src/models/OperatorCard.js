const { DataTypes } = require('sequelize');

/** A yellow (warning) or red (restriction) card the Super Admin gave an operator */
module.exports = (sequelize) => sequelize.define('OperatorCard', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  operatorId: { type: DataTypes.UUID, allowNull: false, field: 'operator_id' },
  kind: { type: DataTypes.STRING(10), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  penaltyAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'penalty_amount' },
  source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'admin' },
  givenBy: { type: DataTypes.STRING(60), allowNull: true, field: 'given_by' },
  clearedAt: { type: DataTypes.DATE, allowNull: true, field: 'cleared_at' }
}, { tableName: 'operator_cards', underscored: true, timestamps: true });
