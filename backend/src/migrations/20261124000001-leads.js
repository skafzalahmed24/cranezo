'use strict';

/**
 * Leads: people who fill in the "Join Cranezo" form on the website (crane owners and operators).
 * The Super Admin reads them in the admin panel, filters them and follows them up.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('leads', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      kind: { type: Sequelize.STRING(10), allowNull: false }, // owner | operator
      full_name: { type: Sequelize.STRING(160), allowNull: false },
      mobile_number: { type: Sequelize.STRING(20), allowNull: false },
      city: { type: Sequelize.STRING(200), allowNull: true },
      answers: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      status: { type: Sequelize.STRING(12), allowNull: false, defaultValue: 'new' }, // new | contacted | joined | rejected
      note: { type: Sequelize.TEXT, allowNull: true },
      source: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'website' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('leads', ['kind', 'status']);
    await queryInterface.addIndex('leads', ['mobile_number']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('leads');
  }
};
