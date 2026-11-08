const { DataTypes } = require('sequelize');

/** One row per crane owner: the plan that is running and when it is due */
module.exports = (sequelize) => sequelize.define('OwnerSubscription', {
  ownerId: { type: DataTypes.UUID, primaryKey: true, allowNull: false, field: 'owner_id' },
  plan: { type: DataTypes.STRING(10), allowNull: false, comment: 'trial, monthly or yearly' },
  startedAt: { type: DataTypes.DATE, allowNull: false, field: 'started_at' },
  periodStart: { type: DataTypes.DATE, allowNull: false, field: 'period_start' },
  dueAt: { type: DataTypes.DATE, allowNull: false, field: 'due_at' },
  lastPaidAt: { type: DataTypes.DATE, allowNull: true, field: 'last_paid_at' },
  remindedAt: { type: DataTypes.DATE, allowNull: true, field: 'reminded_at' }
}, { tableName: 'owner_subscriptions', underscored: true, timestamps: true });
