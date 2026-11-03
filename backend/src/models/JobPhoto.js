const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JobPhoto = sequelize.define('JobPhoto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    bookingId: { type: DataTypes.UUID, allowNull: false, field: 'booking_id' },
    uploadedBy: { type: DataTypes.UUID, allowNull: true, field: 'uploaded_by' },
    kind: { type: DataTypes.STRING(10), allowNull: false, comment: 'site or final' },
    photoUrl: { type: DataTypes.STRING, allowNull: false, field: 'photo_url' },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    capturedAt: { type: DataTypes.DATE, allowNull: true, field: 'captured_at' }
  }, {
    tableName: 'job_photos',
    underscored: true,
    timestamps: true
  });

  return JobPhoto;
};
