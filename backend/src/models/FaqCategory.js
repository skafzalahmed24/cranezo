const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FaqCategory = sequelize.define('FaqCategory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    isActive: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'is_active', comment: '0 active, 1 hidden' }
  }, { tableName: 'faq_categories', underscored: true, timestamps: true });

  return FaqCategory;
};
