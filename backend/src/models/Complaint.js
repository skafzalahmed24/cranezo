const { DataTypes } = require('sequelize');

/** Customer complaint or payment dispute */
module.exports = (sequelize) => sequelize.define('Complaint', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
  complaintCode: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: 'complaint_code' },
  bookingId: { type: DataTypes.UUID, allowNull: true, field: 'booking_id' },
  customerId: { type: DataTypes.UUID, allowNull: false, field: 'customer_id' },
  ownerId: { type: DataTypes.UUID, allowNull: true, field: 'owner_id' },
  category: { type: DataTypes.STRING(30), allowNull: false },
  subject: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  attachments: { type: DataTypes.JSONB, allowNull: true },
  status: { type: DataTypes.STRING(12), allowNull: false, defaultValue: 'open' },
  resolutionNote: { type: DataTypes.TEXT, allowNull: true, field: 'resolution_note' },
  resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
  resolvedByType: { type: DataTypes.STRING(10), allowNull: true, field: 'resolved_by_type' }
}, { tableName: 'complaints', underscored: true, timestamps: true });
