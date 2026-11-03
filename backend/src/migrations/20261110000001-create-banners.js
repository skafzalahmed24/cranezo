'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Home screen banners, managed by the admin (image, text, who sees it, when, and what a tap does)
    await queryInterface.createTable('banners', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      placement: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'home' },
      title: { type: Sequelize.STRING(150), allowNull: true },
      subtitle: { type: Sequelize.STRING(255), allowNull: true },
      button_text: { type: Sequelize.STRING(40), allowNull: true },
      image: { type: Sequelize.STRING(255), allowNull: false },
      audience: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'all', comment: 'all, customer, operator or owner' },
      action_type: { type: Sequelize.STRING(15), allowNull: false, defaultValue: 'none', comment: 'none, book_crane, screen or url' },
      action_value: { type: Sequelize.STRING(255), allowNull: true },
      sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, comment: '0 active, 1 hidden' },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      ends_at: { type: Sequelize.DATE, allowNull: true },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'admins', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('banners', ['placement', 'is_active', 'sort_order']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('banners');
  }
};
