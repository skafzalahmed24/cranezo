'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Set when a crane owner adds an operator; NULL for operators who registered themselves
    await queryInterface.addColumn('users', 'owner_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Crane owner (users.id) who added this operator'
    });
    await queryInterface.addIndex('users', ['owner_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'owner_id');
  }
};
