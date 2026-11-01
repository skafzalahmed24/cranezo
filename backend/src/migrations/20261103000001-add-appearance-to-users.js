'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // App theme: light, dark or system (follow the phone setting)
    await queryInterface.addColumn('users', 'appearance', {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'system',
      comment: 'light, dark or system'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'appearance');
  }
};
