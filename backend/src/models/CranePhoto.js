const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CranePhoto = sequelize.define('CranePhoto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    craneId: { type: DataTypes.UUID, allowNull: false, field: 'crane_id' },
    photoUrl: { type: DataTypes.STRING, allowNull: false, field: 'photo_url' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' }
  }, {
    tableName: 'crane_photos',
    underscored: true,
    timestamps: true
  });

  return CranePhoto;
};
