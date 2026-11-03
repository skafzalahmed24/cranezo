const { DataTypes } = require('sequelize');

/** An operator asking an owner for an open job */
module.exports = (sequelize) => sequelize.define('JobRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  bookingId: { type: DataTypes.UUID, allowNull: false, field: 'booking_id' },
  operatorId: { type: DataTypes.UUID, allowNull: false, field: 'operator_id' },
  ownerId: { type: DataTypes.UUID, allowNull: false, field: 'owner_id' },
  message: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: '0 pending, 1 accepted, 2 rejected, 3 withdrawn, 4 closed' },
  rejectReason: { type: DataTypes.TEXT, allowNull: true, field: 'reject_reason' },
  respondedAt: { type: DataTypes.DATE, allowNull: true, field: 'responded_at' }
}, { tableName: 'job_requests', underscored: true, timestamps: true });
