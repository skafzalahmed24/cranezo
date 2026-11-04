const { DataTypes } = require('sequelize');

/** A customer's booking request sent to every nearby owner (Rapido style) */
module.exports = (sequelize) => {
  const money = (field, allowNull = true) => ({ type: DataTypes.DECIMAL(12, 2), allowNull, field });
  return sequelize.define('CraneRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    requestCode: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: 'request_code' },
    customerId: { type: DataTypes.UUID, allowNull: false, field: 'customer_id' },
    craneType: { type: DataTypes.INTEGER, allowNull: false, field: 'crane_type' },
    capacity: { type: DataTypes.INTEGER, allowNull: false },
    siteName: { type: DataTypes.STRING(150), allowNull: true, field: 'site_name' },
    siteAddress: { type: DataTypes.TEXT, allowNull: false, field: 'site_address' },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
    startType: { type: DataTypes.STRING(12), allowNull: false, field: 'start_type' },
    startAt: { type: DataTypes.DATE, allowNull: false, field: 'start_at' },
    endAt: { type: DataTypes.DATE, allowNull: false, field: 'end_at' },
    durationType: { type: DataTypes.STRING(12), allowNull: false, field: 'duration_type' },
    durationHours: { type: DataTypes.INTEGER, allowNull: false, field: 'duration_hours' },
    durationDays: { type: DataTypes.INTEGER, allowNull: true, field: 'duration_days' },
    specialRequirements: { type: DataTypes.TEXT, allowNull: true, field: 'special_requirements' },
    offerAmount: money('offer_amount', false),
    firstOfferAmount: money('first_offer_amount', false),
    minOfferAmount: money('min_offer_amount', false),
    estimateMin: money('estimate_min'),
    estimateMax: money('estimate_max'),
    autoRaise: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'auto_raise' },
    autoRaiseMax: money('auto_raise_max'),
    raiseCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'raise_count' },
    lastRaisedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_raised_at' },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'searching' },
    expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expires_at' },
    matchedCranes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'matched_cranes' },
    bookingId: { type: DataTypes.UUID, allowNull: true, field: 'booking_id' },
    acceptedAt: { type: DataTypes.DATE, allowNull: true, field: 'accepted_at' },
    closedAt: { type: DataTypes.DATE, allowNull: true, field: 'closed_at' },
    notFoundNote: { type: DataTypes.TEXT, allowNull: true, field: 'not_found_note' },
    adminStatus: { type: DataTypes.STRING(12), allowNull: true, field: 'admin_status' },
    adminNote: { type: DataTypes.TEXT, allowNull: true, field: 'admin_note' }
  }, { tableName: 'crane_requests', underscored: true, timestamps: true });
};
