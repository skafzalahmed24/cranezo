const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Banner = sequelize.define('Banner', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    placement: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'home' },
    title: { type: DataTypes.STRING(150), allowNull: true },
    subtitle: { type: DataTypes.STRING(255), allowNull: true },
    buttonText: { type: DataTypes.STRING(40), allowNull: true, field: 'button_text' },
    image: { type: DataTypes.STRING, allowNull: false },
    audience: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'all' },
    actionType: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'none', field: 'action_type' },
    actionValue: { type: DataTypes.STRING, allowNull: true, field: 'action_value' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    isActive: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'is_active', comment: '0 active, 1 hidden' },
    startsAt: { type: DataTypes.DATE, allowNull: true, field: 'starts_at' },
    endsAt: { type: DataTypes.DATE, allowNull: true, field: 'ends_at' },
    createdBy: { type: DataTypes.UUID, allowNull: true, field: 'created_by' }
  }, { tableName: 'banners', underscored: true, timestamps: true });

  return Banner;
};
