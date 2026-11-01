const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    type: { type: DataTypes.STRING(40), allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    data: { type: DataTypes.JSONB, allowNull: true },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_read' }
  }, {
    tableName: 'notifications',
    underscored: true,
    timestamps: true
  });

  return Notification;
};
