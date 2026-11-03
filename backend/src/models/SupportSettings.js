const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SupportSettings = sequelize.define('SupportSettings', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    supportPhone: { type: DataTypes.STRING(30), allowNull: true, field: 'support_phone' },
    emergencyPhone: { type: DataTypes.STRING(30), allowNull: true, field: 'emergency_phone' },
    supportEmail: { type: DataTypes.STRING(150), allowNull: true, field: 'support_email' },
    hoursLabel: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '24/7', field: 'hours_label' },
    teamMessage: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '24/7 to assist you with any queries.', field: 'team_message' },
    chatWelcome: { type: DataTypes.STRING(255), allowNull: false, defaultValue: 'Hi! How can we help you? Our team replies within a few minutes.', field: 'chat_welcome' }
  }, { tableName: 'support_settings', underscored: true, timestamps: true });

  return SupportSettings;
};
