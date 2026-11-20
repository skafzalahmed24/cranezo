'use strict';

/**
 * Owner sub-admins (employees). An owner's employee registers on the website with the owner's ID, the owner approves
 * them and chooses what they may do. They then work in the owner's account on the web (crane adding, payments, jobs...).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('owner_staff', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      owner_id: { type: Sequelize.UUID, allowNull: false },
      full_name: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(160), allowNull: false },
      mobile_number: { type: Sequelize.STRING(20), allowNull: true },
      password_hash: { type: Sequelize.STRING, allowNull: false },
      permissions: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      // pending (waiting for the owner), active, blocked
      status: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'pending' },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('owner_staff', ['email'], { unique: true, name: 'owner_staff_email_unique' });
    await queryInterface.addIndex('owner_staff', ['owner_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('owner_staff');
  }
};
