const { DataTypes } = require('sequelize');

/** Admin minimum crane hire per hour for one crane type + capacity */
module.exports = (sequelize) => sequelize.define('PriceMinimum', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  craneType: { type: DataTypes.INTEGER, allowNull: false, field: 'crane_type' },
  capacity: { type: DataTypes.INTEGER, allowNull: false },
  minHourlyRate: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'min_hourly_rate' }
}, { tableName: 'price_minimums', underscored: true, timestamps: true });
