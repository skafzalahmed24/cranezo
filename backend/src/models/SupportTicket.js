const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportTicket = sequelize.define('SupportTicket', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    ticketCode: { type: DataTypes.STRING(20), allowNull: false, unique: true, field: 'ticket_code' },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    roleId: { type: DataTypes.INTEGER, allowNull: true, field: 'role_id' },
    category: { type: DataTypes.STRING(20), allowNull: false },
    subject: { type: DataTypes.STRING(200), allowNull: false },
    status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, comment: '0 open, 1 in progress, 2 resolved, 3 closed' },
    priority: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'normal' },
    bookingId: { type: DataTypes.UUID, allowNull: true, field: 'booking_id' },
    assignedAdminId: { type: DataTypes.UUID, allowNull: true, field: 'assigned_admin_id' },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    lastMessageAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'last_message_at' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' }
  }, { tableName: 'support_tickets', underscored: true, timestamps: true });

  return SupportTicket;
};
