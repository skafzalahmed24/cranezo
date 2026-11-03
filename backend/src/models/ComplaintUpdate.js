const { DataTypes } = require('sequelize');

/** One entry in a complaint's history: a message and/or a status change */
module.exports = (sequelize) => sequelize.define('ComplaintUpdate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  complaintId: { type: DataTypes.UUID, allowNull: false, field: 'complaint_id' },
  authorType: { type: DataTypes.STRING(10), allowNull: false, field: 'author_type' },
  authorId: { type: DataTypes.STRING(60), allowNull: true, field: 'author_id' },
  authorName: { type: DataTypes.STRING(150), allowNull: true, field: 'author_name' },
  message: { type: DataTypes.TEXT, allowNull: true },
  statusFrom: { type: DataTypes.STRING(12), allowNull: true, field: 'status_from' },
  statusTo: { type: DataTypes.STRING(12), allowNull: true, field: 'status_to' }
}, { tableName: 'complaint_updates', underscored: true, timestamps: true });
