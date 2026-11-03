const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BookingExtension = sequelize.define('BookingExtension', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    extensionCode: { type: DataTypes.STRING(30), allowNull: false, field: 'extension_code' },
    bookingId: { type: DataTypes.UUID, allowNull: false, field: 'booking_id' },
    requestedBy: { type: DataTypes.UUID, allowNull: true, field: 'requested_by' },
    minutes: { type: DataTypes.INTEGER, allowNull: false },
    hourlyRate: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'hourly_rate' },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: '0 pending, 1 approved, 2 rejected, 3 cancelled, 4 expired' },
    expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expires_at' },
    respondedAt: { type: DataTypes.DATE, allowNull: true, field: 'responded_at' },
    rejectReason: { type: DataTypes.TEXT, allowNull: true, field: 'reject_reason' }
  }, {
    tableName: 'booking_extensions',
    underscored: true,
    timestamps: true
  });

  return BookingExtension;
};
