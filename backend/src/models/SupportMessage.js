const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportMessage = sequelize.define('SupportMessage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    ticketId: { type: DataTypes.UUID, allowNull: false, field: 'ticket_id' },
    senderType: { type: DataTypes.STRING(10), allowNull: false, field: 'sender_type', comment: 'user, admin or system' },
    senderId: { type: DataTypes.UUID, allowNull: true, field: 'sender_id' },
    body: { type: DataTypes.TEXT, allowNull: false },
    attachments: { type: DataTypes.JSONB, allowNull: true },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read', comment: 'read by the other side' }
  }, { tableName: 'support_messages', underscored: true, timestamps: true });

  return SupportMessage;
};
