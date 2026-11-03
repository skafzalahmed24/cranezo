const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Announcement = sequelize.define('Announcement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    audience: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'all' },
    sentCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sent_count' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' }
  }, { tableName: 'announcements', underscored: true, timestamps: true });

  return Announcement;
};
