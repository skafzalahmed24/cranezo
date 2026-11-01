const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const money = (field) => ({ type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field });

  const Booking = sequelize.define('Booking', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    bookingCode: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: 'booking_code' },
    customerId: { type: DataTypes.UUID, allowNull: false, field: 'customer_id' },
    craneId: { type: DataTypes.UUID, allowNull: false, field: 'crane_id' },
    ownerId: { type: DataTypes.UUID, allowNull: false, field: 'owner_id' },
    operatorId: { type: DataTypes.UUID, allowNull: true, field: 'operator_id' },
    craneType: { type: DataTypes.INTEGER, allowNull: false, field: 'crane_type' },
    capacity: { type: DataTypes.INTEGER, allowNull: false },

    siteName: { type: DataTypes.STRING(150), allowNull: true, field: 'site_name' },
    siteAddress: { type: DataTypes.TEXT, allowNull: false, field: 'site_address' },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    distanceKm: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'distance_km' },

    startType: { type: DataTypes.STRING(12), allowNull: false, field: 'start_type' },
    startAt: { type: DataTypes.DATE, allowNull: false, field: 'start_at' },
    endAt: { type: DataTypes.DATE, allowNull: false, field: 'end_at' },
    durationType: { type: DataTypes.STRING(12), allowNull: false, field: 'duration_type' },
    durationHours: { type: DataTypes.INTEGER, allowNull: false, field: 'duration_hours' },
    durationDays: { type: DataTypes.INTEGER, allowNull: true, field: 'duration_days' },

    hourlyRate: money('hourly_rate'),
    craneRental: money('crane_rental'),
    operatorCharges: money('operator_charges'),
    fuelCharges: money('fuel_charges'),
    otherCharges: money('other_charges'),
    totalAmount: money('total_amount'),
    advancePercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 20, field: 'advance_percent' },
    advanceAmount: money('advance_amount'),
    remainingAmount: money('remaining_amount'),

    paymentMethod: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'COD', field: 'payment_method' },
    paymentStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending', field: 'payment_status' },
    paidAmount: money('paid_amount'),

    status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    requestExpiresAt: { type: DataTypes.DATE, allowNull: true, field: 'request_expires_at' },
    acceptedAt: { type: DataTypes.DATE, allowNull: true, field: 'accepted_at' },
    declinedAt: { type: DataTypes.DATE, allowNull: true, field: 'declined_at' },
    declineReason: { type: DataTypes.TEXT, allowNull: true, field: 'decline_reason' },
    expiredAt: { type: DataTypes.DATE, allowNull: true, field: 'expired_at' },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
    cancelledBy: { type: DataTypes.STRING(12), allowNull: true, field: 'cancelled_by' },
    cancelReason: { type: DataTypes.TEXT, allowNull: true, field: 'cancel_reason' }
  }, {
    tableName: 'bookings',
    underscored: true,
    timestamps: true
  });

  return Booking;
};
