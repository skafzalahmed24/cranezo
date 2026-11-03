'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Filled when a job is completed, so a later change of the platform fee never rewrites old earnings
    await queryInterface.addColumn('bookings', 'platform_fee_percent', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('bookings', 'platform_fee_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await queryInterface.addColumn('bookings', 'deductions_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('bookings', 'net_amount', { type: Sequelize.DECIMAL(12, 2), allowNull: true, comment: 'what the owner receives: final amount - platform fee - deductions' });
    await queryInterface.addIndex('bookings', ['owner_id', 'status', 'completed_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('bookings', 'net_amount');
    await queryInterface.removeColumn('bookings', 'deductions_amount');
    await queryInterface.removeColumn('bookings', 'platform_fee_amount');
    await queryInterface.removeColumn('bookings', 'platform_fee_percent');
  }
};
