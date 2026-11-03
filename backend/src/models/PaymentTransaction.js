const { DataTypes } = require('sequelize');

/** Every customer payment attempt (cash or gateway) */
module.exports = (sequelize) => sequelize.define('PaymentTransaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  transactionCode: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: 'transaction_code' },
  bookingId: { type: DataTypes.UUID, allowNull: false, field: 'booking_id' },
  customerId: { type: DataTypes.UUID, allowNull: true, field: 'customer_id' },
  ownerId: { type: DataTypes.UUID, allowNull: true, field: 'owner_id' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  method: { type: DataTypes.STRING(20), allowNull: false },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'initiated' },
  collectedBy: { type: DataTypes.STRING(10), allowNull: false, field: 'collected_by' },
  gateway: { type: DataTypes.STRING(30), allowNull: true },
  gatewayOrderId: { type: DataTypes.STRING(80), allowNull: true, field: 'gateway_order_id' },
  gatewayPaymentId: { type: DataTypes.STRING(80), allowNull: true, field: 'gateway_payment_id' },
  failureReason: { type: DataTypes.TEXT, allowNull: true, field: 'failure_reason' },
  meta: { type: DataTypes.JSONB, allowNull: true }
}, { tableName: 'payment_transactions', underscored: true, timestamps: true });
