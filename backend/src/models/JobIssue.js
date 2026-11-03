const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JobIssue = sequelize.define('JobIssue', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    bookingId: { type: DataTypes.UUID, allowNull: false, field: 'booking_id' },
    reportedBy: { type: DataTypes.UUID, allowNull: true, field: 'reported_by' },
    kind: { type: DataTypes.STRING(12), allowNull: false, comment: 'breakdown, issue or emergency' },
    breakdownType: { type: DataTypes.INTEGER, allowNull: true, field: 'breakdown_type', comment: 'Static dropdown ID (type 15)' },
    description: { type: DataTypes.TEXT, allowNull: true },
    photos: { type: DataTypes.JSONB, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'open', comment: 'open or resolved' }
  }, {
    tableName: 'job_issues',
    underscored: true,
    timestamps: true
  });

  return JobIssue;
};
