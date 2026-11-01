const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LegalPage = sequelize.define('LegalPage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    pageType: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: 'page_type' },
    title: { type: DataTypes.STRING(150), allowNull: false },
    intro: { type: DataTypes.TEXT, allowNull: true },
    lastUpdated: { type: DataTypes.DATEONLY, allowNull: false, field: 'last_updated' },
    sections: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    isActive: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'is_active', comment: '0 active, 1 inactive' }
  }, {
    tableName: 'legal_pages',
    underscored: true,
    timestamps: true
  });

  return LegalPage;
};
