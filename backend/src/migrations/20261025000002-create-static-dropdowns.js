'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('static_dropdowns', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      dropdown_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      dropdown_description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      dropdown_type: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Type identifier for grouping dropdown values (e.g. 1 for languages)'
      },
      dropdown_type_status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0 for active, 1 for inactive'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('static_dropdowns', ['dropdown_type']);
    await queryInterface.addIndex('static_dropdowns', ['dropdown_type_status']);
    await queryInterface.addIndex('static_dropdowns', ['dropdown_type', 'dropdown_type_status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('static_dropdowns');
  }
};
