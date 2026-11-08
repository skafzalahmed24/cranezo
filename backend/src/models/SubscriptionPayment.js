const { DataTypes } = require('sequelize');

/** A Razorpay payment for an owner subscription (the total includes GST and the online payment fee) */
module.exports = (sequelize) => sequelize.define('SubscriptionPayment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  paymentCode: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: 'payment_code' },
  ownerId: { type: DataTypes.UUID, allowNull: false, field: 'owner_id' },
  plan: { type: DataTypes.STRING(10), allowNull: false },
  baseAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'base_amount' },
  gstAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'gst_amount' },
  gatewayFee: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'gateway_fee' },
  totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'initiated' },
  gatewayOrderId: { type: DataTypes.STRING(80), allowNull: true, field: 'gateway_order_id' },
  gatewayPaymentId: { type: DataTypes.STRING(80), allowNull: true, field: 'gateway_payment_id' },
  periodStart: { type: DataTypes.DATE, allowNull: true, field: 'period_start' },
  periodEnd: { type: DataTypes.DATE, allowNull: true, field: 'period_end' },
  failureReason: { type: DataTypes.TEXT, allowNull: true, field: 'failure_reason' }
}, { tableName: 'subscription_payments', underscored: true, timestamps: true });
