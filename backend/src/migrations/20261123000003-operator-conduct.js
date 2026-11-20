'use strict';

/**
 * Operator conduct: yellow and red cards given by the Super Admin, a block until the penalty is cleared,
 * when an operator was last active (7 days quiet = needs attention), when the app was removed, and
 * that the operator read the safety rules. bookings.reached_notified_at: the customer is told once when the
 * operator's phone reaches the site.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'last_active_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('users', 'app_removed_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('users', 'penalty_due', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('users', 'conduct_blocked', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.addColumn('users', 'safety_ack_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('bookings', 'reached_notified_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.createTable('operator_cards', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      operator_id: { type: Sequelize.UUID, allowNull: false },
      kind: { type: Sequelize.STRING(10), allowNull: false }, // yellow | red
      reason: { type: Sequelize.TEXT, allowNull: false },
      penalty_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      source: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'admin' }, // admin | app_removed
      given_by: { type: Sequelize.STRING(60), allowNull: true },
      cleared_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') }
    });
    await queryInterface.addIndex('operator_cards', ['operator_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('operator_cards');
    await queryInterface.removeColumn('bookings', 'reached_notified_at');
    for (const c of ['safety_ack_at', 'conduct_blocked', 'penalty_due', 'app_removed_at', 'last_active_at']) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn('users', c);
    }
  }
};
