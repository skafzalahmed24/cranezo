'use strict';

/** Operators must upload a Voter ID card as well as their license: a file and its verification status. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'voter_id_file', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('users', 'voter_id_status', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'voter_id_status');
    await queryInterface.removeColumn('users', 'voter_id_file');
  }
};
