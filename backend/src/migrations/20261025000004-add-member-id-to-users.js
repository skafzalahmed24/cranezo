'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add member_id column to users table
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.member_id) {
      await queryInterface.addColumn('users', 'member_id', {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true
      });
      await queryInterface.addIndex('users', ['member_id'], {
        unique: true,
        name: 'users_member_id_unique'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo.member_id) {
      await queryInterface.removeIndex('users', 'users_member_id_unique');
      await queryInterface.removeColumn('users', 'member_id');
    }
  }
};
