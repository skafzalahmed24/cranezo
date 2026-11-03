const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Faq = sequelize.define('Faq', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: false, field: 'category_id' },
    question: { type: DataTypes.STRING(255), allowNull: false },
    answer: { type: DataTypes.TEXT, allowNull: false },
    audience: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'all', comment: 'all, customer, operator or owner' },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
    isActive: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'is_active', comment: '0 active, 1 hidden' },
    helpfulYes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'helpful_yes' },
    helpfulNo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'helpful_no' }
  }, { tableName: 'faqs', underscored: true, timestamps: true });

  return Faq;
};
