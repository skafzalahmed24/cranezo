'use strict';

/**
 * 1. users.session_id: one signed-in device per phone number. Every sign-in with OTP makes a new session id for all
 *    the accounts of that number; a token with an older id is refused (the other device is signed out).
 * 2. One phone number can hold up to three accounts, one per role (owner, operator, customer): the same
 *    number cannot have two accounts of the same role. Switching role signs into the other account.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'session_id', { type: Sequelize.STRING(64), allowNull: true });
    // role_id may be empty for someone who has not chosen a role yet (empty values do not clash with each other)
    await queryInterface.addIndex('users', ['country_code', 'mobile_number', 'role_id'], { unique: true, name: 'users_phone_role_unique' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('users', 'users_phone_role_unique');
    await queryInterface.removeColumn('users', 'session_id');
  }
};
