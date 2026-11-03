const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BookingRating = sequelize.define('BookingRating', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    bookingId: { type: DataTypes.UUID, allowNull: false, unique: true, field: 'booking_id' },
    customerId: { type: DataTypes.UUID, allowNull: false, field: 'customer_id' },
    craneId: { type: DataTypes.UUID, allowNull: false, field: 'crane_id' },
    operatorId: { type: DataTypes.UUID, allowNull: true, field: 'operator_id' },
    ownerId: { type: DataTypes.UUID, allowNull: true, field: 'owner_id' },
    rating: { type: DataTypes.INTEGER, allowNull: false, comment: '1 to 5' },
    comment: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'booking_ratings',
    underscored: true,
    timestamps: true
  });

  return BookingRating;
};
